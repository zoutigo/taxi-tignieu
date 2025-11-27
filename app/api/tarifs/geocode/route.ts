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

    const res = await fetch(
      `${ORS_GEOCODE_URL}?api_key=${apiKey}&text=${encodeURIComponent(text)}`
    );
    if (!res.ok) {
      const details = await res.text();
      return NextResponse.json({ error: "Échec du geocoding", details }, { status: 502 });
    }
    const data = await res.json();
    const first = data.features?.[0];
    if (!first?.geometry?.coordinates) {
      return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
    }
    const [lng, lat] = first.geometry.coordinates;
    return NextResponse.json({
      lat,
      lng,
      label: first.properties?.label ?? text,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
