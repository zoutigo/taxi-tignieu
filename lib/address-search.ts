import { parseAddressParts, type AddressData } from "@/lib/booking-utils";

export const normalizeAddressSuggestion = (s: AddressData): AddressData => {
  const parsed = parseAddressParts(s.label);
  const streetNumber = s.streetNumber ?? parsed.streetNumber ?? "";
  let street = s.street ?? parsed.street ?? "";
  if (streetNumber) {
    const regex = new RegExp(`^\\s*${streetNumber}\\s+`, "i");
    street = street.replace(regex, "").trim();
  }
  if (!street && parsed.street) {
    street = parsed.street;
  }
  if (streetNumber) {
    const regex = new RegExp(`^\\s*${streetNumber}\\s+`, "i");
    street = street.replace(regex, "").trim();
  }
  const withCountry =
    s.country && !s.label.toLowerCase().includes(s.country.toLowerCase())
      ? `${s.label}, ${s.country}`
      : s.label;

  return {
    ...s,
    label: withCountry,
    city: s.city ?? parsed.city,
    postcode: s.postcode ?? parsed.cp,
    street,
    streetNumber,
  };
};

export async function fetchAddressSuggestions(query: string): Promise<AddressData[]> {
  if (query.trim().length < 3) return [];

  try {
    const res = await fetch(`/api/tarifs/search?q=${encodeURIComponent(query)}`);
    const data = (await res.json()) as { results?: AddressData[] };
    const normalizedQuery = query.trim().toLowerCase();
    const queryNumberMatch = query.match(/(\d{1,4})/);
    const queryNumber = queryNumberMatch?.[1] ?? null;
    const normalized =
      data.results
        ?.map((s) => normalizeAddressSuggestion(s))
        .filter((s) => {
          const label = s.label.toLowerCase();
          const streetLine = `${s.streetNumber ?? ""} ${s.street ?? ""}`.trim().toLowerCase();
          const matchesQuery =
            label.includes(normalizedQuery) ||
            streetLine.includes(normalizedQuery) ||
            (s.street ?? "").toLowerCase().includes(normalizedQuery);

          return (
            Number.isFinite(s.lat) &&
            Number.isFinite(s.lng) &&
            ((s.city?.trim().length ?? 0) > 0 || (s.postcode?.trim().length ?? 0) > 0) &&
            matchesQuery &&
            (!queryNumber || (s.streetNumber ?? "").toString().includes(queryNumber))
          );
        })
        .filter((s, idx, arr) => {
          const key = `${s.label.toLowerCase()}-${s.lat}-${s.lng}-${s.postcode ?? ""}-${s.city ?? ""}`;
          return (
            arr.findIndex(
              (t) =>
                `${t.label.toLowerCase()}-${t.lat}-${t.lng}-${t.postcode ?? ""}-${t.city ?? ""}` ===
                key
            ) === idx
          );
        })
        .filter((s) => s.label.toLowerCase() !== normalizedQuery)
        ?.slice(0, 5) ?? [];

    if (normalized.length > 0) {
      return normalized;
    }

    // Fallback: geocode unique result for free-text queries
    try {
      const geoRes = await fetch(`/api/tarifs/geocode?q=${encodeURIComponent(query)}`);
      if (geoRes.ok) {
        const geo = (await geoRes.json()) as AddressData | null;
        if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
          return [normalizeAddressSuggestion(geo)];
        }
      }
    } catch {
      // ignore
    }

    return [];
  } catch {
    return [];
  }
}
