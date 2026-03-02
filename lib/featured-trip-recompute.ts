import { prisma } from "@/lib/prisma";
import { getTariffConfig } from "@/lib/tariff-config";
import { computePriceEuros } from "@/lib/tarifs";
import { getOrsDrivingDistance } from "@/lib/ors-distance";

type Coords = { lat: number; lng: number };

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

const ensureCoords = async (address: {
  id?: string | null;
  label: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<{ addressId: string; coords: Coords }> => {
  if (address.id && address.latitude != null && address.longitude != null) {
    return { addressId: address.id, coords: { lat: address.latitude, lng: address.longitude } };
  }

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

export async function recomputeFeaturedTripById(tripId: string): Promise<void> {
  const trips = await prisma.featuredTrip.findMany({
    where: { id: tripId },
    include: {
      pickupAddress: true,
      dropoffAddress: true,
      poiDestinations: { include: { dropoffAddress: true } },
    },
  });
  const trip = trips[0];
  if (!trip) return;

  const pickupLabel = trip.pickupLabel || trip.title;
  const { addressId: pickupAddressId, coords: pickupCoords } = await ensureCoords({
    id: trip.pickupAddressId,
    label: pickupLabel,
    latitude: trip.pickupAddress?.latitude,
    longitude: trip.pickupAddress?.longitude,
  });

  let firstPoiPriceCents: number | null = null;
  for (const poi of trip.poiDestinations) {
    const { addressId: dropoffAddressId, coords: dropoffCoords } = await ensureCoords({
      id: poi.dropoffAddressId,
      label: poi.label,
      latitude: poi.dropoffAddress?.latitude,
      longitude: poi.dropoffAddress?.longitude,
    });
    const quote = await quotePoi(pickupCoords, dropoffCoords);
    const poiPriceCents = Math.round(quote.price * 100);
    if (poi.order === 0 && firstPoiPriceCents == null) {
      firstPoiPriceCents = poiPriceCents;
    }
    await prisma.featuredPoi.update({
      where: { id: poi.id },
      data: {
        dropoffAddressId,
        distanceKm: quote.distanceKm,
        durationMinutes: quote.durationMinutes,
        priceCents: poiPriceCents,
      },
    });
  }

  let tripDropoffAddressId = trip.dropoffAddressId ?? null;
  let typeQuote: { distanceKm: number; durationMinutes: number; price: number } | null = null;
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

  const basePriceCents =
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
      basePriceCents,
    },
  });
}
