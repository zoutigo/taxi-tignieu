import { NextResponse } from "next/server";

const ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("q");
    if (!text) {
      return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé OpenRouteService manquante côté serveur." },
        { status: 500 }
      );
    }

    const orsRes = await fetch(
      `${ORS_GEOCODE_URL}?api_key=${apiKey}&text=${encodeURIComponent(text)}&size=1&lang=fr`
    );
    const data = orsRes.ok
      ? ((await orsRes.json().catch(() => null)) as {
          features?: Array<{
            geometry?: { coordinates?: [number, number] };
            properties?: Record<string, unknown>;
          }>;
        } | null)
      : null;
    const firstOrs = data?.features?.[0];

    // Fallback Photon si ORS ne trouve rien
    let first = firstOrs;
    if (!first?.geometry?.coordinates) {
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=1&lang=fr`
      );
      if (photonRes.ok) {
        const photonData = await photonRes.json();
        first = photonData?.features?.[0];
      }
    }

    if (!first?.geometry?.coordinates) {
      return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
    }
    const [lng, lat] = first.geometry.coordinates;

    const props: Record<string, unknown> = first.properties ?? {};
    const house = (props.housenumber as string) ?? "";
    const street = (props.street as string) ?? (props.name as string) ?? "";
    const locality =
      (props.locality as string) ??
      (props.city as string) ??
      (props.county as string) ??
      (props.region as string) ??
      (props.state as string) ??
      "";
    const postcode = (props.postalcode as string) ?? (props.postcode as string) ?? "";
    const country = (props.country as string) ?? "";

    const parts = [house, street, locality, postcode, country].filter(Boolean);
    const label = props.label ?? (parts.join(", ") || text);

    return NextResponse.json({
      lat,
      lng,
      label,
      city: locality,
      country,
      postcode,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
