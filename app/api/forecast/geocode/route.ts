import { NextResponse } from "next/server";
import dns from "node:dns";

type GeocodeResult = {
  formatted_address: string;
  lat: number;
  lng: number;
  place_id: string;
  components: Array<{
    long_name: string;
    short_name?: string;
    types: string[];
  }>;
  street?: string;
  streetNumber?: string;
  postcode?: string;
  city?: string;
  country?: string;
};

type BucketState = { tokens: number; lastRefill: number };
const cache = new Map<string, { expires: number; data: GeocodeResult[] }>();
const bucket = new Map<string, BucketState>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RATE_CAPACITY = 30;
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const now = () => Date.now();

const normalizeAddress = (addr: string) => addr.trim().toLowerCase();

const refillBucket = (key: string) => {
  const state = bucket.get(key) ?? { tokens: RATE_CAPACITY, lastRefill: now() };
  const elapsed = now() - state.lastRefill;
  const tokensToAdd = Math.floor((elapsed / RATE_WINDOW_MS) * RATE_CAPACITY);
  if (tokensToAdd > 0) {
    state.tokens = Math.min(RATE_CAPACITY, state.tokens + tokensToAdd);
    state.lastRefill = now();
  }
  bucket.set(key, state);
  return state;
};

const consumeToken = (key: string) => {
  const state = refillBucket(key);
  if (state.tokens <= 0) return false;
  state.tokens -= 1;
  bucket.set(key, state);
  return true;
};

const getIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "anon";
  return req.headers.get("x-real-ip") ?? "anon";
};

type GoogleAddressComponent = {
  long_name: string;
  short_name?: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  place_id?: string;
  address_components?: GoogleAddressComponent[];
};

const mapGoogleResult = (r: GoogleGeocodeResult): GeocodeResult => {
  const components = Array.isArray(r.address_components) ? r.address_components : [];
  const getComp = (type: string) =>
    components.find(
      (c: GoogleAddressComponent) => Array.isArray(c.types) && c.types.includes(type)
    );
  const streetNumber = getComp("street_number")?.long_name ?? "";
  const street = getComp("route")?.long_name ?? "";
  const postcode = getComp("postal_code")?.long_name ?? "";
  const city =
    getComp("locality")?.long_name ??
    getComp("postal_town")?.long_name ??
    getComp("administrative_area_level_2")?.long_name ??
    "";
  const country = getComp("country")?.long_name ?? "";
  return {
    formatted_address:
      r.formatted_address ?? [streetNumber, street, postcode, city, country].join(", "),
    lat: Number(r.geometry?.location?.lat ?? NaN),
    lng: Number(r.geometry?.location?.lng ?? NaN),
    place_id: r.place_id ?? "",
    components,
    street: street || undefined,
    streetNumber: streetNumber || undefined,
    postcode: postcode || undefined,
    city: city || undefined,
    country: country || undefined,
  };
};

// Favor IPv4 first (avoid IPv6-only resolution issues)
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };
    const address = body.address?.trim() ?? "";
    if (!address || address.length < 5) {
      return NextResponse.json({ error: "Adresse requise (min 5 caractères)." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé Google Maps absente côté serveur." }, { status: 500 });
    }

    const ip = getIp(request);
    if (!consumeToken(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const cacheKey = normalizeAddress(address);
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > now()) {
      return NextResponse.json({ results: cached.data });
    }

    const params = new URLSearchParams({
      address,
      key: apiKey,
      components: "country:FR",
      language: "fr",
      region: "fr",
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );
    if (!res.ok) {
      const details = await res.text().catch(() => "Réponse Google non lisible.");
      return NextResponse.json(
        { error: "Échec de l'appel Google Geocoding.", details },
        { status: 502 }
      );
    }
    const data = await res.json();
    const status = data?.status;
    if (status === "ZERO_RESULTS") {
      return NextResponse.json({ error: "Aucun résultat pour cette adresse." }, { status: 404 });
    }
    if (status === "INVALID_REQUEST") {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    if (
      status === "OVER_QUERY_LIMIT" ||
      status === "REQUEST_DENIED" ||
      status === "UNKNOWN_ERROR"
    ) {
      return NextResponse.json(
        { error: "Service Google indisponible temporairement." },
        { status: 502 }
      );
    }
    if (status !== "OK" || !Array.isArray(data?.results)) {
      return NextResponse.json(
        { error: "Réponse Google non exploitable.", details: data?.error_message ?? status },
        { status: 502 }
      );
    }

    const mapped: GeocodeResult[] = (data.results as GoogleGeocodeResult[])
      .map(mapGoogleResult)
      .filter((r: GeocodeResult) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
    if (!mapped.length) {
      return NextResponse.json({ error: "Aucun point géocodable." }, { status: 404 });
    }

    cache.set(cacheKey, { expires: now() + ONE_DAY_MS, data: mapped.slice(0, 5) });

    return NextResponse.json({ results: mapped.slice(0, 5) });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne", details: String(error) }, { status: 500 });
  }
}
