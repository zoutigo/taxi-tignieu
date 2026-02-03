import { NextResponse } from "next/server";
import { computePriceEuros, type TariffCode } from "@/lib/tarifs";
import { getTariffConfig } from "@/lib/tariff-config";

type Coord = { lat: number; lng: number };

const haversineKm = (a: Coord, b: Coord) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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
    const tariff = (body.tariff ?? "A") as TariffCode;
    const passengers = Math.max(0, Number(body.passengers ?? 1));
    const baggageCount = Math.max(
      0,
      Number(
        (body as { baggageCount?: number; luggage?: number }).baggageCount ?? body["luggage"] ?? 0
      )
    );
    const fifthPassenger = Boolean(body.fifthPassenger ?? passengers > 4);
    const waitMinutes = Math.max(0, Number(body.waitMinutes ?? 0));
    const providedDistance = Number(body.distanceKm);
    const providedDuration = Number(body.durationMinutes);

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

    const distanceKmRaw = Number.isFinite(providedDistance)
      ? Number(providedDistance)
      : haversineKm(from, to);
    const distanceKm = Math.max(0, distanceKmRaw);
    const durationMinutes = Number.isFinite(providedDuration)
      ? Math.max(0, providedDuration)
      : Math.round((distanceKm / 40) * 60); // approx 40 km/h if non fourni
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

    if (process.env.NODE_ENV !== "production") {
      console.log("[forecast/quote]", {
        pickup: from,
        dropoff: to,
        tariff,
        passengers,
        baggageCount,
        fifthPassenger,
        waitMinutes,
        distanceKm,
        durationMinutes,
        price,
        date: body.date,
        time: body.time,
      });
    }

    return NextResponse.json({ distanceKm, durationMinutes, price });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
