import { parseAddressParts, type AddressData } from "@/lib/booking-utils";

export const normalizeAddressSuggestion = (s: AddressData, query?: string): AddressData => {
  const parsed = parseAddressParts(s.label);
  const queryTokens = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const queryNumber = queryTokens.find((t) => /^\d{1,5}$/.test(t));
  const queryPostcode = queryTokens.find((t) => /^\d{4,5}$/.test(t));

  const streetNumber = s.streetNumber ?? parsed.streetNumber ?? queryNumber ?? "";
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
  const postcode = s.postcode ?? parsed.cp ?? queryPostcode ?? "";
  const labelLine1 = [streetNumber, street].filter(Boolean).join(" ").trim();
  const labelLine2 = [postcode, s.city ?? parsed.city].filter(Boolean).join(" ").trim();
  let withCountry =
    s.country && !s.label.toLowerCase().includes(s.country.toLowerCase())
      ? `${s.label}, ${s.country}`
      : s.label;
  const normalizedLabel = withCountry.toLowerCase();
  if (labelLine1 && !normalizedLabel.includes(labelLine1.toLowerCase())) {
    withCountry = [labelLine1, labelLine2, s.country].filter(Boolean).join(", ");
  } else if (labelLine2 && !normalizedLabel.includes(labelLine2.toLowerCase())) {
    withCountry = `${withCountry}, ${labelLine2}`;
  }

  return {
    ...s,
    label: withCountry,
    city: s.city ?? parsed.city,
    postcode,
    street,
    streetNumber,
  };
};

export async function fetchAddressSuggestions(query: string): Promise<AddressData[]> {
  if (query.trim().length < 3) return [];

  try {
    const res = await fetch("/api/forecast/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: query }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<AddressData & { formatted_address?: string; place_id?: string }>;
    };
    return (
      data.results
        ?.map((s) =>
          normalizeAddressSuggestion(
            {
              ...s,
              label: s.formatted_address ?? s.label ?? query,
            },
            query
          )
        )
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
        .slice(0, 5) ?? []
    );
  } catch {
    return [];
  }
}

export async function fetchForecastAddressSuggestions(query: string): Promise<AddressData[]> {
  if (query.trim().length < 5) return [];
  try {
    const res = await fetch("/api/forecast/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: query }),
    });
    if (!res.ok) {
      // Surface server error to dev console (dev only) to understand why it fails (e.g., Google REQUEST_DENIED)
      if (process.env.NODE_ENV !== "production") {
        try {
          const errPayload = await res.json();
          console.warn("forecast geocode error", errPayload);
        } catch {
          // ignore parse errors
        }
      }
      return [];
    }
    const data = (await res.json()) as {
      results?: Array<
        AddressData & {
          formatted_address?: string;
        }
      >;
    };
    return (
      data.results
        ?.map((s) =>
          normalizeAddressSuggestion(
            {
              ...s,
              label: s.formatted_address ?? s.label ?? query,
            },
            query
          )
        )
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .slice(0, 5) ?? []
    );
  } catch {
    return [];
  }
}
