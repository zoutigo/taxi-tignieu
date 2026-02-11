import { NextResponse } from "next/server";
import { parseAddressParts } from "@/lib/booking-utils";

const PHOTON_URL = "https://photon.komoot.io/api";
const ORS_AUTOCOMPLETE_URL = "https://api.openrouteservice.org/geocode/autocomplete";

type Feature = {
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: number[] };
};

type ScoreEntry = {
  label: string;
  city: string;
  postcode: string;
  country: string;
  street?: string;
  streetNumber?: string;
  lat: number;
  lng: number;
  score: number;
  firstTokenPos: number;
  cityTokensMatchAll: boolean;
  numberMatch: boolean;
  postcodeMatch: boolean;
};

const fetchORSAutocomplete = async (query: string, apiKey?: string) => {
  if (!apiKey) return null;
  const url = `${ORS_AUTOCOMPLETE_URL}?api_key=${apiKey}&text=${encodeURIComponent(
    query
  )}&size=6&lang=fr&boundary.country=FRA&layers=address,street,venue&sources=openstreetmap`;
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

const enrichWithGeocode = async (text: string, apiKey?: string): Promise<Partial<ScoreEntry>> => {
  if (!apiKey) return {};
  try {
    const params = new URLSearchParams({
      address: text,
      key: apiKey,
      components: "country:FR",
      language: "fr",
      region: "fr",
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    if (!res.ok) return {};
    const data = (await res.json()) as {
      status?: string;
      results?: Array<{
        geometry?: { location?: { lat?: number; lng?: number } };
        address_components?: Array<{ long_name: string; types: string[] }>;
      }>;
    };
    if (data.status !== "OK" || !data.results?.length) return {};
    const first = data.results[0];
    const comps = first.address_components ?? [];
    const pick = (type: string) => comps.find((c) => c.types.includes(type))?.long_name;

    return {
      streetNumber: pick("street_number"),
      street: pick("route"),
      postcode: pick("postal_code"),
      city:
        pick("locality") ?? pick("postal_town") ?? pick("administrative_area_level_2") ?? undefined,
      country: pick("country"),
      lat: first.geometry?.location?.lat,
      lng: first.geometry?.location?.lng,
    };
  } catch {
    return {};
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Parse query for fallback components (number/CP/city)
    const parsedQuery = parseAddressParts(q);
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
    const numberToken = parsedQuery.streetNumber || tokens.find((t) => /^\d+$/.test(t));
    const cityTokens = tokens.filter((t) => t.length > 2 && !/^\d+$/.test(t));
    const cpToken = parsedQuery.cp || tokens.find((t) => /^\d{4,5}$/.test(t));
    const queryStreet = normalize(parsedQuery.street ?? "").toLowerCase();
    const features: Feature[] = (chosen as { features?: Feature[] }).features ?? [];

    const extractAddress = (props: Record<string, unknown> = {}) => {
      const streetNumberRaw =
        (props.housenumber as string) ??
        (props.house_number as string) ??
        (props.number as string) ??
        "";
      const street =
        (props.street as string) ?? (props.streetname as string) ?? (props.name as string) ?? "";
      const postcodeRaw = (props.postalcode as string) ?? (props.postcode as string) ?? "";
      const city =
        (props.city as string) ??
        (props.locality as string) ??
        (props.county as string) ??
        (props.region as string) ??
        (props.state as string) ??
        "";
      const country = (props.country as string) ?? "";

      const streetNumber = streetNumberRaw || numberToken || "";
      const postcode = postcodeRaw || cpToken || "";

      const line1 = [streetNumber, street].filter(Boolean).join(" ").trim();
      const line2 = [postcode, city].filter(Boolean).join(" ").trim();

      let label = (props.label as string) ?? "";
      const normalizedLabel = normalize(label);
      const needsLine1 = line1 && !normalizedLabel.includes(normalize(line1));
      const needsPostcode = postcode && !normalizedLabel.includes(postcode);
      if (!label) {
        label = [line1 || street || streetNumber, line2, country].filter(Boolean).join(", ");
      } else if (needsLine1) {
        label = [line1, line2, country].filter(Boolean).join(", ");
      } else if (needsPostcode && line2) {
        label = [label, line2, country].filter(Boolean).join(", ");
      }

      return { streetNumber, street, postcode, city, country, label };
    };

    const scored: ScoreEntry[] =
      features.map((f) => {
        const { street, streetNumber, postcode, city, country, label } = extractAddress(
          f.properties
        );
        const normLabel = normalize(label).toLowerCase();
        const hasNumber = streetNumber ? true : /\d+/.test(label);
        const numberMatch =
          (numberToken && normLabel.includes(numberToken)) ||
          (streetNumber && numberToken === streetNumber);
        const postcodeMatch =
          (cpToken && postcode && postcode.includes(cpToken)) ||
          (postcode && normLabel.includes(postcode));
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
          (numberMatch ? 26 : hasNumber ? 8 : -12) +
          (postcode ? 14 : 0) + // +10 par rapport aux autres critères
          (postcodeMatch ? 16 : cpToken ? -8 : 0) +
          (city ? 3 : 0) +
          (cityTokensMatchAll ? 20 : 0) +
          (country?.toLowerCase() === "france" || country?.toLowerCase() === "fr" ? 18 : -22) +
          Math.max(0, 8 - firstTokenPos / 8);

        if (numberToken && !numberMatch) score -= 10;
        if (cityTokens.length > 0 && cityHits === 0) score -= 12;

        return {
          label,
          city,
          postcode,
          country,
          street,
          streetNumber,
          lat: Number(f.geometry?.coordinates?.[1]),
          lng: Number(f.geometry?.coordinates?.[0]),
          score,
          firstTokenPos,
          cityTokensMatchAll,
          numberMatch: Boolean(numberMatch),
          postcodeMatch: Boolean(postcodeMatch),
        };
      }) ?? [];

    const isFrance = (c: string) => {
      const val = c?.toLowerCase();
      return val === "france" || val === "fr";
    };
    const hasFrance = scored.some((s) => isFrance(s.country));

    // Prioritize perfect city matches and number matches first, then by score
    const baseResults = (hasFrance ? scored.filter((s) => isFrance(s.country)) : scored).sort(
      (a: ScoreEntry, b: ScoreEntry) => {
        if (a.cityTokensMatchAll !== b.cityTokensMatchAll) return a.cityTokensMatchAll ? -1 : 1;
        if (a.numberMatch !== b.numberMatch) return a.numberMatch ? -1 : 1;
        return (
          b.score - a.score || a.firstTokenPos - b.firstTokenPos || a.label.length - b.label.length
        );
      }
    );

    const results = await Promise.all(
      baseResults.map(
        async ({ label, city, postcode, country, street, streetNumber, lat, lng }) => {
          const finalStreetNumber = streetNumber || numberToken || "";
          const finalPostcode = postcode || cpToken || "";

          // Enrich if number or postcode missing
          if (!streetNumber || !postcode) {
            const enrich = await enrichWithGeocode(q, process.env.GOOGLE_MAPS_API_KEY);
            if (enrich.streetNumber) streetNumber = String(enrich.streetNumber);
            if (enrich.postcode) postcode = String(enrich.postcode);
            if (enrich.street) street = enrich.street;
            if (enrich.city) city = enrich.city;
            if (enrich.country) country = enrich.country;
            if (Number.isFinite(enrich.lat) && Number.isFinite(enrich.lng)) {
              lat = enrich.lat as number;
              lng = enrich.lng as number;
            }
          }

          const rebuiltLabel = [
            [streetNumber || finalStreetNumber, street].filter(Boolean).join(" ").trim() || label,
            [postcode || finalPostcode, city].filter(Boolean).join(" ").trim(),
            country,
          ]
            .filter((p) => p && p.length > 0)
            .join(", ");

          return {
            label: rebuiltLabel || label,
            city,
            postcode: postcode || finalPostcode,
            country,
            street,
            streetNumber: streetNumber || finalStreetNumber,
            lat,
            lng,
          };
        }
      )
    );

    const filtered = results.filter((r) => {
      const streetNorm = normalize(r.street ?? "").toLowerCase();
      const cityNorm = normalize(r.city ?? "").toLowerCase();
      const cityTokensMatch =
        cityTokens.length === 0 || cityTokens.every((t) => cityNorm.includes(t));
      const streetMatch = !queryStreet || (streetNorm && streetNorm.includes(queryStreet));
      const cpMatch = !cpToken || !r.postcode || r.postcode === cpToken;
      return streetMatch && cityTokensMatch && cpMatch;
    });

    return NextResponse.json({ results: filtered.length > 0 ? filtered : results });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
