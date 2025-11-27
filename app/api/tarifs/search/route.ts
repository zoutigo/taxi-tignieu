import { NextResponse } from "next/server";

const PHOTON_URL = "https://photon.komoot.io/api";

const fetchPhoton = async (query: string) => {
  const url = `${PHOTON_URL}/?q=${encodeURIComponent(query)}&limit=6&lang=fr`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  return res.json();
};

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const primary = await fetchPhoton(q);
    const fallbackQuery = normalize(q);
    const secondary = fallbackQuery !== q ? await fetchPhoton(fallbackQuery) : null;
    const data =
      primary ??
      secondary ??
      ({
        features: [],
      } as {
        features?: Array<{
          properties?: {
            label?: string;
            name?: string;
            city?: string;
            postcode?: string;
            country?: string;
          };
          geometry?: { coordinates?: [number, number] };
        }>;
      });
    if (!data) {
      return NextResponse.json({ error: "Échec de la recherche Photon" }, { status: 502 });
    }
    const typedData = data as {
      features?: Array<{
        properties?: {
          label?: string;
          name?: string;
          city?: string;
          postcode?: string;
          country?: string;
        };
        geometry?: { coordinates?: [number, number] };
      }>;
    };
    const results =
      typedData.features?.map((f) => ({
        label: f.properties?.label ?? f.properties?.name ?? q,
        city: f.properties?.city ?? f.properties?.country ?? "",
        postcode: f.properties?.postcode ?? "",
        lat: f.geometry?.coordinates?.[1],
        lng: f.geometry?.coordinates?.[0],
      })) ?? [];
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
