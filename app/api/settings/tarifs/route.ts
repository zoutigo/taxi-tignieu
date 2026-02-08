import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computePriceEuros, defaultTariffConfig } from "@/lib/tarifs";
import { getTariffConfig } from "@/lib/tariff-config";

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

type Coords = { lat: number; lng: number };

const haversineKm = (a: Coords, b: Coords) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const ensureCoords = async (address: {
  id?: string | null;
  label: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<{ addressId: string; coords: Coords }> => {
  if (address.id && address.latitude != null && address.longitude != null) {
    return { addressId: address.id, coords: { lat: address.latitude, lng: address.longitude } };
  }

  // Geocode direct via Google to éviter un aller-retour HTTP local qui peut échouer sur certaines stacks VPS
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY manquant pour le geocoding.");
  }

  const params = new URLSearchParams({
    address: address.label,
    key: apiKey,
    components: "country:FR",
    language: "fr",
    region: "fr",
  });

  const geoRes = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  );
  if (!geoRes.ok) {
    throw new Error(`Geocoding HTTP failed (${geoRes.status}) for ${address.label}`);
  }
  const geoJson = await geoRes.json();
  const first = Array.isArray(geoJson?.results) ? geoJson.results[0] : null;
  const loc = first?.geometry?.location;
  const lat = Number(loc?.lat ?? first?.lat);
  const lng = Number(loc?.lng ?? first?.lng);
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
  const cfg = await getTariffConfig();
  const distanceKm = haversineKm(from, to);
  const durationMinutes = Math.round((distanceKm / 40) * 60); // approx 40 km/h si non fourni
  const price = computePriceEuros(
    distanceKm,
    "A",
    { baggageCount: 0, fifthPassenger: false, waitMinutes: 0 },
    cfg
  );
  return { distanceKm, durationMinutes, price };
};

async function refreshFeaturedTripsWithTariff() {
  // En tests, le client Prisma peut être partiellement mocké : on sort proprement.
  if (!(prisma as { featuredTrip?: { findMany?: unknown } }).featuredTrip?.findMany) {
    return;
  }

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
