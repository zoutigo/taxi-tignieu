import { NextResponse } from "next/server";
import { computePriceEuros, type TariffCode } from "@/lib/tarifs";

type Coord = { lat: number; lng: number };

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      from?: Coord;
      to?: Coord;
      tariff?: TariffCode;
      baggageCount?: number;
      fifthPassenger?: boolean;
      waitMinutes?: number;
    };

    if (!body.from || !body.to || !body.tariff) {
      return NextResponse.json(
        { error: "Coordonnées de départ/arrivée et tarif requis." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé OpenRouteService manquante côté serveur." },
        { status: 500 }
      );
    }

    const fromLat = Number(body.from.lat);
    const fromLng = Number(body.from.lng);
    const toLat = Number(body.to.lat);
    const toLng = Number(body.to.lng);
    if (
      Number.isNaN(fromLat) ||
      Number.isNaN(fromLng) ||
      Number.isNaN(toLat) ||
      Number.isNaN(toLng)
    ) {
      return NextResponse.json(
        { error: "Coordonnées invalides. Vérifiez les adresses ou les lat/lon." },
        { status: 400 }
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
      const text = await orsRes.text();
      return NextResponse.json(
        { error: "Échec du calcul d’itinéraire ORS", details: text },
        { status: 502 }
      );
    }

    const orsBody = await orsRes.text();
    let data:
      | {
          features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }>;
          routes?: Array<{ summary?: { distance?: number; duration?: number } }>;
        }
      | undefined;
    try {
      data = JSON.parse(orsBody);
    } catch {
      return NextResponse.json(
        { error: "Réponse ORS non valide (parse JSON)", details: orsBody },
        { status: 502 }
      );
    }

    const featureSummary = data?.features?.[0]?.properties?.summary;
    const routeSummary = data?.routes?.[0]?.summary;
    const summary = featureSummary ?? routeSummary;

    if (!summary?.distance || typeof summary.duration !== "number") {
      return NextResponse.json(
        {
          error: "Réponse ORS incomplète pour le calcul d’itinéraire.",
          details: orsBody,
        },
        { status: 502 }
      );
    }

    const distanceKm = summary.distance / 1000;
    const durationMinutes = summary.duration / 60;
    const price = computePriceEuros(distanceKm, body.tariff, {
      baggageCount: body.baggageCount,
      fifthPassenger: body.fifthPassenger,
      waitMinutes: body.waitMinutes,
    });

    return NextResponse.json({
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.round(durationMinutes),
      price,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
