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

    const haversineKm = () => {
      const R = 6371;
      const dLat = ((toLat - fromLat) * Math.PI) / 180;
      const dLng = ((toLng - fromLng) * Math.PI) / 180;
      const la1 = (fromLat * Math.PI) / 180;
      const la2 = (toLat * Math.PI) / 180;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      const fallbackDistance = Math.round(haversineKm() * 100) / 100;
      const fallbackDuration = Math.round((fallbackDistance / 40) * 60);
      return NextResponse.json(
        { distanceKm: fallbackDistance, durationMinutes: fallbackDuration, fallback: true },
        { status: 200 }
      );
    }

    let distanceKm: number | null = null;
    let durationMinutes: number | null = null;

    try {
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

      if (orsRes.ok) {
        const raw = await orsRes.text();
        const parsed = JSON.parse(raw) as {
          features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }>;
          routes?: Array<{ summary?: { distance?: number; duration?: number } }>;
        };
        const summary =
          parsed.features?.[0]?.properties?.summary ?? parsed.routes?.[0]?.summary ?? undefined;
        const dKm = summary?.distance ? summary.distance / 1000 : NaN;
        const dMin = summary?.duration ? summary.duration / 60 : NaN;
        if (Number.isFinite(dKm) && Number.isFinite(dMin)) {
          distanceKm = dKm;
          durationMinutes = dMin;
        }
      }
    } catch {
      // ignore and fallback
    }

    if (distanceKm == null) {
      distanceKm = Math.round(haversineKm() * 100) / 100;
      durationMinutes = Math.round((distanceKm / 40) * 60);
    } else {
      distanceKm = Math.round(distanceKm * 100) / 100;
      durationMinutes = durationMinutes != null ? Math.round(durationMinutes) : null;
    }

    const result = {
      distanceKm,
      durationMinutes: durationMinutes ?? Math.round((distanceKm / 40) * 60),
    };
    cache.set(key, { ...result, expires: Date.now() + TTL_MS });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
