import { NextResponse } from "next/server";

type Coord = { lat: number; lng: number };

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const cache = new Map<string, { expires: number; distanceKm: number; durationMinutes: number }>();
const TTL_MS = 10 * 60 * 1000;

const cacheKey = (from: Coord, to: Coord) =>
  `${from.lat.toFixed(6)},${from.lng.toFixed(6)}->${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pickup?: Coord; dropoff?: Coord };
    const from = body.pickup;
    const to = body.dropoff;
    if (!from || !to) {
      return NextResponse.json(
        { error: "Coordonnées pickup et dropoff requises." },
        { status: 400 }
      );
    }

    const fromLat = Number(from.lat);
    const fromLng = Number(from.lng);
    const toLat = Number(to.lat);
    const toLng = Number(to.lng);
    if (
      !Number.isFinite(fromLat) ||
      !Number.isFinite(fromLng) ||
      !Number.isFinite(toLat) ||
      !Number.isFinite(toLng)
    ) {
      return NextResponse.json({ error: "Coordonnées invalides." }, { status: 400 });
    }

    const key = cacheKey(from, to);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json({
        distanceKm: cached.distanceKm,
        durationMinutes: cached.durationMinutes,
      });
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé OpenRouteService manquante côté serveur." },
        { status: 500 }
      );
    }

    const orsRes = await fetch(ORS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        coordinates: [
          [fromLng, fromLat],
          [toLng, toLat],
        ],
      }),
    });

    if (!orsRes.ok) {
      const details = await orsRes.text().catch(() => "Réponse ORS indisponible");
      return NextResponse.json(
        { error: "Échec du calcul d'itinéraire ORS", details },
        { status: 502 }
      );
    }

    const raw = await orsRes.text();
    let parsed:
      | {
          features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }>;
          routes?: Array<{ summary?: { distance?: number; duration?: number } }>;
        }
      | undefined;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Réponse ORS non valide", details: raw }, { status: 502 });
    }

    const feature = parsed?.features?.[0]?.properties?.summary;
    const route = parsed?.routes?.[0]?.summary;
    const summary = feature ?? route;

    const distanceKm = summary?.distance ? summary.distance / 1000 : NaN;
    const durationMinutes = summary?.duration ? summary.duration / 60 : NaN;

    if (!Number.isFinite(distanceKm) || !Number.isFinite(durationMinutes)) {
      return NextResponse.json({ error: "Réponse ORS incomplète." }, { status: 502 });
    }

    const result = {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.round(durationMinutes),
    };
    cache.set(key, { ...result, expires: Date.now() + TTL_MS });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
