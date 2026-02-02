import { NextResponse } from "next/server";
import { computePriceEuros, type TariffCode } from "@/lib/tarifs";
import { getTariffConfig } from "@/lib/tariff-config";

type Coord = { lat: number; lng: number };

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const cache = new Map<
  string,
  { expires: number; distanceKm: number; durationMinutes: number; price: number }
>();
const TTL_MS = 10 * 60 * 1000;

const cacheKey = (from: Coord, to: Coord, tariff: string, passengers: number, luggage: number) =>
  `${from.lat.toFixed(6)},${from.lng.toFixed(6)}->${to.lat.toFixed(6)},${to.lng.toFixed(
    6
  )}-${tariff}-${passengers}-${luggage}`;

async function fetchDistance(from: Coord, to: Coord) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) {
    throw new Error("Clé OpenRouteService manquante côté serveur.");
  }
  const orsRes = await fetch(ORS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    }),
  });
  if (!orsRes.ok) {
    const details = await orsRes.text().catch(() => "Réponse ORS indisponible");
    throw new Error("Échec du calcul d'itinéraire ORS: " + details);
  }
  const raw = await orsRes.text();
  const parsed = JSON.parse(raw) as {
    features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }>;
    routes?: Array<{ summary?: { distance?: number; duration?: number } }>;
  };
  const summary =
    parsed.features?.[0]?.properties?.summary ?? parsed.routes?.[0]?.summary ?? undefined;
  const distanceKm = summary?.distance ? summary.distance / 1000 : NaN;
  const durationMinutes = summary?.duration ? summary.duration / 60 : NaN;
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationMinutes)) {
    throw new Error("Réponse ORS incomplète.");
  }
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMinutes: Math.round(durationMinutes),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pickup?: Coord;
      dropoff?: Coord;
      date?: string;
      time?: string;
      passengers?: number;
      luggage?: number;
      tariff?: TariffCode;
    };

    const from = body.pickup;
    const to = body.dropoff;
    const tariff = (body.tariff ?? "A") as TariffCode;
    const passengers = Number(body.passengers ?? 1);
    const luggage = Number(body.luggage ?? 0);

    if (!from || !to) {
      return NextResponse.json(
        { error: "Coordonnées pickup et dropoff requises." },
        { status: 400 }
      );
    }
    if (
      !Number.isFinite(from.lat) ||
      !Number.isFinite(from.lng) ||
      !Number.isFinite(to.lat) ||
      !Number.isFinite(to.lng)
    ) {
      return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });
    }

    const key = cacheKey(from, to, tariff, passengers, luggage);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached);
    }

    const { distanceKm, durationMinutes } = await fetchDistance(from, to);
    const cfg = await getTariffConfig();
    const price = computePriceEuros(
      distanceKm,
      tariff,
      {
        baggageCount: luggage,
        fifthPassenger: passengers > 4,
        waitMinutes: 0,
      },
      cfg
    );

    const payload = { distanceKm, durationMinutes, price };
    cache.set(key, { ...payload, expires: Date.now() + TTL_MS });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
