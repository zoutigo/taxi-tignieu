import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { defaultTariffConfig } from "@/lib/tarifs";

const payloadSchema = z.object({
  baseCharge: z.number().nonnegative(),
  kmA: z.number().nonnegative(),
  kmB: z.number().nonnegative(),
  kmC: z.number().nonnegative(),
  kmD: z.number().nonnegative(),
  waitPerHour: z.number().nonnegative(),
  baggageFee: z.number().nonnegative(),
  fifthPassenger: z.number().nonnegative(),
});

const toCents = (value: number) => Math.round(value * 100);

const isAdminLike = (session: unknown): boolean =>
  Boolean((session as { user?: { isAdmin?: boolean; isManager?: boolean } })?.user?.isAdmin) ||
  Boolean((session as { user?: { isManager?: boolean } })?.user?.isManager);

export async function GET() {
  const config = await prisma.tariffConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const fallback = defaultTariffConfig;

  const payload = config
    ? {
        baseCharge: config.baseChargeCents / 100,
        kmA: config.kmCentsA / 100,
        kmB: config.kmCentsB / 100,
        kmC: config.kmCentsC / 100,
        kmD: config.kmCentsD / 100,
        waitPerHour: config.waitPerHourCents / 100,
        baggageFee: config.baggageFeeCents / 100,
        fifthPassenger: config.fifthPassengerCents / 100,
      }
    : {
        baseCharge: fallback.baseChargeCents / 100,
        kmA: fallback.kmCentsA / 100,
        kmB: fallback.kmCentsB / 100,
        kmC: fallback.kmCentsC / 100,
        kmD: fallback.kmCentsD / 100,
        waitPerHour: fallback.waitPerHourCents / 100,
        baggageFee: fallback.baggageFeeCents / 100,
        fifthPassenger: fallback.fifthPassengerCents / 100,
      };

  return NextResponse.json(payload, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;
  const centsPayload = {
    baseChargeCents: toCents(data.baseCharge),
    kmCentsA: toCents(data.kmA),
    kmCentsB: toCents(data.kmB),
    kmCentsC: toCents(data.kmC),
    kmCentsD: toCents(data.kmD),
    waitPerHourCents: toCents(data.waitPerHour),
    baggageFeeCents: toCents(data.baggageFee),
    fifthPassengerCents: toCents(data.fifthPassenger),
  };

  const existing = await prisma.tariffConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const updated = await prisma.tariffConfig.upsert({
    where: { id: existing?.id ?? "" },
    update: centsPayload,
    create: { ...centsPayload },
  });

  const safeRevalidate = (tag: string) => {
    try {
      (revalidateTag as unknown as (t: string, revalidate?: number | "max") => void)(tag, "max");
    } catch {
      // En environnement de test ou hors contexte cache, on ignore l'erreur d'invariant.
    }
  };
  safeRevalidate("tariff-config");
  safeRevalidate("featured-trips");

  // Recalcule tous les featured trips/POI pour refléter les nouveaux tarifs.
  try {
    await refreshFeaturedTripsWithTariff();
  } catch (err) {
    console.error("Failed to refresh featured trips after tariff update:", err);
  }

  return NextResponse.json(updated, { status: 200 });
}

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

type Coords = { lat: number; lng: number };

const ensureCoords = async (address: {
  id?: string | null;
  label: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<{ addressId: string; coords: Coords }> => {
  if (address.id && address.latitude != null && address.longitude != null) {
    return { addressId: address.id, coords: { lat: address.latitude, lng: address.longitude } };
  }

  // Geocode via internal API (forecast/geocode)
  const geoRes = await fetch(`${baseUrl}/api/forecast/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: address.label }),
  });
  const geoJson = geoRes.ok ? await geoRes.json().catch(() => null) : null;
  const first = Array.isArray(geoJson?.results) ? geoJson.results[0] : null;
  const lat = Number(first?.lat);
  const lng = Number(first?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Geocoding failed for ${address.label}`);
  }

  const addrRecord =
    address.id ??
    (
      await prisma.address.create({
        data: {
          name: address.label,
          street: first?.street,
          streetNumber: first?.streetNumber,
          postalCode: first?.postcode,
          city: first?.city,
          country: first?.country,
          latitude: lat,
          longitude: lng,
        },
        select: { id: true },
      })
    ).id;

  if (address.id) {
    await prisma.address.update({
      where: { id: address.id },
      data: { latitude: lat, longitude: lng },
    });
  }

  return { addressId: addrRecord, coords: { lat, lng } };
};

const quotePoi = async (from: Coords, to: Coords) => {
  const res = await fetch(`${baseUrl}/api/forecast/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pickup: from,
      dropoff: to,
      tariff: "A",
    }),
  });
  if (!res.ok) throw new Error(`Quote failed: ${res.status}`);
  return (await res.json()) as { distanceKm: number; durationMinutes: number; price: number };
};

async function refreshFeaturedTripsWithTariff() {
  const trips = await prisma.featuredTrip.findMany({
    include: {
      pickupAddress: true,
      poiDestinations: { include: { dropoffAddress: true } },
    },
  });

  for (const trip of trips) {
    try {
      const pickupLabel = trip.pickupLabel || trip.title;
      const { addressId: pickupAddressId, coords: pickupCoords } = await ensureCoords({
        id: trip.pickupAddressId,
        label: pickupLabel,
        latitude: trip.pickupAddress?.latitude,
        longitude: trip.pickupAddress?.longitude,
      });

      const updatedPois = [];
      for (const poi of trip.poiDestinations) {
        const label = poi.label;
        const { addressId: dropoffAddressId, coords: dropoffCoords } = await ensureCoords({
          id: poi.dropoffAddressId,
          label,
          latitude: poi.dropoffAddress?.latitude,
          longitude: poi.dropoffAddress?.longitude,
        });

        const quote = await quotePoi(pickupCoords, dropoffCoords);

        updatedPois.push(
          prisma.featuredPoi.update({
            where: { id: poi.id },
            data: {
              dropoffAddressId,
              distanceKm: quote.distanceKm,
              durationMinutes: quote.durationMinutes,
              priceCents: Math.round(quote.price * 100),
            },
          })
        );
      }

      await Promise.all(updatedPois);

      const firstPoi = trip.poiDestinations[0];
      const basePrice =
        firstPoi && typeof firstPoi.priceCents === "number"
          ? firstPoi.priceCents
          : updatedPois.length
            ? undefined
            : trip.basePriceCents;

      await prisma.featuredTrip.update({
        where: { id: trip.id },
        data: {
          pickupAddressId,
          basePriceCents: basePrice,
        },
      });
    } catch (error) {
      console.error("Refresh featured trip failed", trip.id, error);
    }
  }
}
