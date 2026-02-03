import { NextResponse } from "next/server";

const ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";
const PHOTON_URL = "https://photon.komoot.io/api";

type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

const extract = (f?: Feature) => {
  const props: Record<string, unknown> = f?.properties ?? {};
  const housenumber =
    (props.housenumber as string) ??
    (props.house_number as string) ??
    (props.number as string) ??
    "";
  const street =
    (props.street as string) ?? (props.streetname as string) ?? (props.name as string) ?? "";
  const postcode = (props.postalcode as string) ?? (props.postcode as string) ?? "";
  const city =
    (props.locality as string) ??
    (props.city as string) ??
    (props.county as string) ??
    (props.region as string) ??
    (props.state as string) ??
    "";
  const country = (props.country as string) ?? "";
  const coords = f?.geometry?.coordinates;
  const label = (props.label as string) ?? "";
  return {
    housenumber,
    street,
    postcode,
    city,
    country,
    coords,
    label,
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("q");
    if (!text) {
      return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
    }

    const candidates: Feature[] = [];
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;

    if (apiKey) {
      try {
        const orsRes = await fetch(
          `${ORS_GEOCODE_URL}?api_key=${apiKey}&text=${encodeURIComponent(
            text
          )}&size=5&lang=fr&layers=address&sources=openstreetmap&boundary.country=FRA`
        );
        if (orsRes.ok) {
          const data = (await orsRes.json().catch(() => null)) as { features?: Feature[] } | null;
          if (data?.features?.length) candidates.push(...data.features);
        }
      } catch {
        // ignore
      }
    }

    try {
      const photonRes = await fetch(`${PHOTON_URL}/?q=${encodeURIComponent(text)}&limit=5&lang=fr`);
      if (photonRes.ok) {
        const photonData = (await photonRes.json()) as { features?: Feature[] };
        if (photonData?.features?.length) candidates.push(...photonData.features);
      }
    } catch {
      // ignore
    }

    if (!candidates.length) {
      return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
    }

    const scored = candidates
      .map((f) => {
        const { housenumber, postcode, city, street, country, coords, label } = extract(f);
        const hasCoords = Array.isArray(coords) && coords.length >= 2;
        const score =
          (housenumber ? 30 : 0) +
          (postcode ? 20 : 0) +
          (city ? 8 : 0) +
          (street ? 6 : 0) +
          (hasCoords ? 10 : 0);
        return { housenumber, postcode, city, street, country, coords, label, score };
      })
      .sort((a, b) => b.score - a.score);

    const results = scored.map((r) => {
      const [lng, lat] = r.coords ?? [];
      const parts = [r.housenumber, r.street, r.city, r.postcode, r.country]
        .filter(Boolean)
        .join(", ");
      const label = r.label || parts || text;
      return {
        lat,
        lng,
        label,
        city: r.city,
        country: r.country,
        postcode: r.postcode,
        street: r.street,
        streetNumber: r.housenumber,
      };
    });

    const first = results[0];
    if (!first) {
      return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
    }

    return NextResponse.json({ ...first, results });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
