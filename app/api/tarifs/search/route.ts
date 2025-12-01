import { NextResponse } from "next/server";

const PHOTON_URL = "https://photon.komoot.io/api";
const ORS_AUTOCOMPLETE_URL = "https://api.openrouteservice.org/geocode/autocomplete";

const fetchORSAutocomplete = async (query: string, apiKey?: string) => {
  if (!apiKey) return null;
  const url = `${ORS_AUTOCOMPLETE_URL}?api_key=${apiKey}&text=${encodeURIComponent(
    query
  )}&size=6&lang=fr`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.features?.length) return null;
  return data;
};

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
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    const ors = await fetchORSAutocomplete(q, apiKey);
    const fallbackQuery = normalize(q);
    const orsFallback =
      !ors && fallbackQuery !== q ? await fetchORSAutocomplete(fallbackQuery, apiKey) : null;
    const photon = !ors && !orsFallback ? await fetchPhoton(q) : null;
    const photonFallback =
      !ors && !orsFallback && fallbackQuery !== q ? await fetchPhoton(fallbackQuery) : null;
    const chosen =
      ors ??
      orsFallback ??
      (photon && photon.features?.length ? photon : null) ??
      (photonFallback && photonFallback.features?.length ? photonFallback : null);

    if (!chosen) {
      return NextResponse.json({ results: [] });
    }

    const normQ = normalize(q).toLowerCase();
    const tokens = normQ.split(" ").filter(Boolean);
    const numberToken = tokens.find((t) => /^\d+$/.test(t));
    const cityTokens = tokens.filter((t) => t.length > 2 && !/^\d+$/.test(t));
    const features: Array<{
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: number[] };
    }> =
      (
        chosen as {
          features?: Array<{
            properties?: Record<string, unknown>;
            geometry?: { coordinates?: number[] };
          }>;
        }
      ).features ?? [];

    type ScoreEntry = {
      label: string;
      city: string;
      postcode: string;
      country: string;
      lat: number;
      lng: number;
      score: number;
      firstTokenPos: number;
      cityTokensMatchAll: boolean;
      numberMatch: boolean;
    };

    const scored: ScoreEntry[] =
      features.map((f) => {
        const label = String(f.properties?.label ?? f.properties?.name ?? q);
        const city = String(
          f.properties?.city ??
            f.properties?.locality ??
            f.properties?.county ??
            f.properties?.region ??
            f.properties?.country ??
            ""
        );
        const postcode = String(f.properties?.postalcode ?? f.properties?.postcode ?? "");
        const country = String(f.properties?.country ?? "");
        const normLabel = normalize(label).toLowerCase();
        const hasNumber = /\d+/.test(label);
        const numberMatch = numberToken && normLabel.includes(numberToken);
        const startsWith = normLabel.startsWith(normQ);
        const containsAllTokens = tokens.every((t) => normLabel.includes(t));
        const tokenHits = tokens.reduce((acc, t) => acc + (normLabel.includes(t) ? 1 : 0), 0);
        const cityHits = cityTokens.reduce((acc, t) => acc + (normLabel.includes(t) ? 1 : 0), 0);
        const fullSubstring = normLabel.includes(normQ);
        const firstTokenPos =
          tokens.length > 0 && normLabel.includes(tokens[0]) ? normLabel.indexOf(tokens[0]) : 999;
        const cityString = normalize(`${city} ${postcode}`).toLowerCase();
        const cityTokensMatchAll =
          cityTokens.length > 0 && cityTokens.every((t) => cityString.includes(t));

        let score =
          (startsWith ? 30 : 0) +
          (fullSubstring ? 18 : 0) +
          (containsAllTokens ? 12 : 0) +
          tokenHits * 2 +
          cityHits * 4 +
          (numberMatch ? 20 : hasNumber ? 5 : -10) +
          (postcode ? 14 : 0) + // +10 par rapport aux autres critères
          (city ? 3 : 0) +
          (cityTokensMatchAll ? 20 : 0) +
          (country?.toLowerCase() === "france" ? 1 : 0) +
          Math.max(0, 8 - firstTokenPos / 8);

        if (numberToken && !numberMatch) score -= 10;
        if (cityTokens.length > 0 && cityHits === 0) score -= 12;

        return {
          label,
          city,
          postcode,
          country,
          lat: Number(f.geometry?.coordinates?.[1]),
          lng: Number(f.geometry?.coordinates?.[0]),
          score,
          firstTokenPos,
          cityTokensMatchAll,
          numberMatch: Boolean(numberMatch),
        };
      }) ?? [];

    // Prioritize perfect city matches and number matches first, then by score
    const results = scored
      .sort((a: ScoreEntry, b: ScoreEntry) => {
        if (a.cityTokensMatchAll !== b.cityTokensMatchAll) return a.cityTokensMatchAll ? -1 : 1;
        if (a.numberMatch !== b.numberMatch) return a.numberMatch ? -1 : 1;
        return (
          b.score - a.score || a.firstTokenPos - b.firstTokenPos || a.label.length - b.label.length
        );
      })
      .map(({ label, city, postcode, country, lat, lng }) => ({
        label,
        city,
        postcode,
        country,
        lat,
        lng,
      }));
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
