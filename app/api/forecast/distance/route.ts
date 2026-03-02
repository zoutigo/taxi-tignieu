import { NextResponse } from "next/server";
import { getOrsDrivingDistance } from "@/lib/ors-distance";

type Coord = { lat: number; lng: number };

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
        source: "cache",
      });
    }

    try {
      const result = await getOrsDrivingDistance(
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng }
      );
      cache.set(key, {
        distanceKm: result.distanceKm,
        durationMinutes: result.durationMinutes,
        expires: Date.now() + TTL_MS,
      });
      return NextResponse.json({ ...result, source: "ors" });
    } catch (error) {
      const msg = String(error);
      const status = msg.includes("manquante côté serveur") ? 500 : 502;
      return NextResponse.json(
        {
          error:
            status === 500
              ? "OPENROUTESERVICE_API_KEY manquante côté serveur."
              : "Échec OpenRouteService.",
          details: msg,
        },
        { status }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
