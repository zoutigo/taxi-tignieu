import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computePriceEuros, defaultTariffConfig } from "@/lib/tarifs";
import { getTariffConfig } from "@/lib/tariff-config";
import { getOrsDrivingDistance } from "@/lib/ors-distance";
import { enqueueTariffRecomputeJob } from "@/lib/tariff-recompute-queue";

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

  // Recalcul asynchrone via file SQL+cron; fallback sync uniquement si file indisponible.
  let queuedJobId: string | null = null;
  try {
    const queued = await enqueueTariffRecomputeJob();
    queuedJobId = queued?.jobId ?? null;
  } catch (err) {
    console.error("Failed to enqueue tariff recompute job:", err);
  }

  if (!queuedJobId) {
    try {
      await refreshFeaturedTripsWithTariff();
    } catch (err) {
      console.error("Failed to refresh featured trips after tariff update:", err);
    }
  }

  return NextResponse.json(
    {
      ...updated,
      recompute: queuedJobId ? { mode: "queued", jobId: queuedJobId } : { mode: "sync_fallback" },
    },
    { status: 200 }
  );
}

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
  const { distanceKm, durationMinutes } = await getOrsDrivingDistance(from, to);
  const price = computePriceEuros(
    distanceKm,
    "C",
    { baggageCount: 1, fifthPassenger: false, waitMinutes: 0 },
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
      dropoffAddress: true,
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

      let firstPoiPriceCents: number | null = null;
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
        const poiPriceCents = Math.round(quote.price * 100);
        if (poi.order === 0 && firstPoiPriceCents == null) {
          firstPoiPriceCents = poiPriceCents;
        }

        updatedPois.push(
          prisma.featuredPoi.update({
            where: { id: poi.id },
            data: {
              dropoffAddressId,
              distanceKm: quote.distanceKm,
              durationMinutes: quote.durationMinutes,
              priceCents: poiPriceCents,
            },
          })
        );
      }

      await Promise.all(updatedPois);

      let tripDropoffAddressId = trip.dropoffAddressId ?? null;
      let typeQuote: { distanceKm: number; durationMinutes: number; price: number } | null = null;

      // For TYPE trips (or trips without POIs), keep trip-level metrics/pricing in sync.
      if (trip.dropoffLabel) {
        const { addressId: resolvedDropoffId, coords: dropoffCoords } = await ensureCoords({
          id: trip.dropoffAddressId,
          label: trip.dropoffLabel,
          latitude: trip.dropoffAddress?.latitude,
          longitude: trip.dropoffAddress?.longitude,
        });
        tripDropoffAddressId = resolvedDropoffId;
        typeQuote = await quotePoi(pickupCoords, dropoffCoords);
      }

      const basePrice =
        firstPoiPriceCents != null
          ? firstPoiPriceCents
          : typeQuote
            ? Math.round(typeQuote.price * 100)
            : trip.basePriceCents;

      await prisma.featuredTrip.update({
        where: { id: trip.id },
        data: {
          pickupAddressId,
          dropoffAddressId: tripDropoffAddressId,
          distanceKm: typeQuote?.distanceKm ?? trip.distanceKm,
          durationMinutes: typeQuote?.durationMinutes ?? trip.durationMinutes,
          basePriceCents: basePrice,
        },
      });
    } catch (error) {
      console.error("Refresh featured trip failed", trip.id, error);
    }
  }
}
