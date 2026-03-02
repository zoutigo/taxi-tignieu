import { NextResponse } from "next/server";
import { computePriceEuros, type TariffCode } from "@/lib/tarifs";
import { getTariffConfig } from "@/lib/tariff-config";
import { getOrsDrivingDistance } from "@/lib/ors-distance";

type Coord = { lat: number; lng: number };

const inferDayNightTariff = (date?: string, time?: string): TariffCode => {
  let hour: number | null = null;
  if (date && time) {
    const dt = new Date(`${date}T${time}`);
    if (!Number.isNaN(dt.getTime())) {
      hour = dt.getHours();
    }
  }
  if (hour == null && time) {
    const match = time.match(/^(\d{1,2}):/);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) {
        hour = parsed;
      }
    }
  }
  if (hour == null) return "C";
  return hour < 7 || hour >= 19 ? "D" : "C";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pickup?: Coord;
      dropoff?: Coord;
      distanceKm?: number;
      durationMinutes?: number;
      date?: string;
      time?: string;
      passengers?: number;
      baggageCount?: number;
      luggage?: number;
      fifthPassenger?: boolean;
      waitMinutes?: number;
      tariff?: TariffCode;
    };

    const from = body.pickup;
    const to = body.dropoff;
    const tariff = inferDayNightTariff(body.date, body.time);
    const passengers = Math.max(0, Number(body.passengers ?? 1));
    const parsedBaggage = Number(
      (body as { baggageCount?: number; luggage?: number }).baggageCount ?? body["luggage"] ?? 1
    );
    const baggageCount = Number.isFinite(parsedBaggage) ? Math.max(1, parsedBaggage) : 1;
    const fifthPassenger = Boolean(body.fifthPassenger ?? passengers > 4);
    const waitMinutes = Math.max(0, Number(body.waitMinutes ?? 0));

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

    let distanceKm = 0;
    let durationMinutes = 0;
    try {
      const result = await getOrsDrivingDistance(
        { lat: Number(from.lat), lng: Number(from.lng) },
        { lat: Number(to.lat), lng: Number(to.lng) }
      );
      distanceKm = result.distanceKm;
      durationMinutes = result.durationMinutes;
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

    const cfg = await getTariffConfig();
    const price = computePriceEuros(
      distanceKm,
      tariff,
      {
        baggageCount,
        fifthPassenger,
        waitMinutes,
      },
      cfg
    );

    return NextResponse.json({
      distanceKm,
      durationMinutes,
      price,
      source: "ors",
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
