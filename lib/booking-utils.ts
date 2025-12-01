export type Coord = { lat: number; lng: number };

export type AddressData = {
  label: string;
  lat: number;
  lng: number;
  city?: string;
  postcode?: string;
  country?: string;
  street?: string;
  streetNumber?: string;
  name?: string;
};

export const haversineKm = (a: Coord, b: Coord) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon));
  return R * c;
};

export const inferTariffFromDateTime = (dateStr: string, timeStr: string) => {
  if (!dateStr || !timeStr) return "A";
  const dt = new Date(`${dateStr}T${timeStr}`);
  const hour = dt.getHours();
  const isNight = hour < 7 || hour >= 19;
  const isWeekend = [0, 6].includes(dt.getDay());
  return isNight || isWeekend ? "B" : "A";
};

export const parseAddressParts = (label: string) => {
  const cpMatch = label.match(/(\d{5})/);
  const cp = cpMatch?.[1] ?? "";
  let city = "";
  let street = "";
  let streetNumber = "";
  const normalized = label.replace(/\s+/g, " ");
  const segments = normalized
    .split(/[,|-]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const streetCandidate = segments.find((s) => /\d/.test(s) && /[a-zA-Z]/.test(s));
  if (streetCandidate) {
    const numMatch = streetCandidate.match(/^\s*(\d+)\s+/);
    streetNumber = numMatch?.[1] ?? "";
    street = cp
      ? streetCandidate.replace(new RegExp(`\\b${cp}\\b`, "g"), "").trim()
      : streetCandidate;
    street = street.replace(/[,|-]\s*$/, "").trim();
  }

  if (cpMatch) {
    const after = normalized.slice(cpMatch.index! + cp.length);
    const parts = after
      .split(/[,|-]/)
      .map((s) => s.trim())
      .filter(Boolean);
    city = parts.find((s) => /[a-zA-Z]{3,}/.test(s)) ?? "";
  } else {
    city = segments.find((s) => /[a-zA-Z]{3,}/.test(s) && !/\d/.test(s)) ?? "";
  }
  return { cp, city, street, streetNumber };
};

type GeocodeResponse = {
  lat: number;
  lng: number;
  label?: string;
  city?: string;
  postcode?: string;
  country?: string;
  street?: string;
  name?: string;
} | null;

type SearchSuggestion = {
  label: string;
  city?: string;
  postcode?: string;
  country?: string;
  lat: number;
  lng: number;
};

export async function fetchAddressData(address: string): Promise<AddressData> {
  const geocode = async (): Promise<GeocodeResponse> => {
    const res = await fetch(`/api/tarifs/geocode?q=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    return (await res.json()) as GeocodeResponse;
  };

  const searchTop = async (text: string): Promise<SearchSuggestion | null> => {
    try {
      const res = await fetch(`/api/tarifs/search?q=${encodeURIComponent(text)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { results?: SearchSuggestion[] };
      return data.results?.[0] ?? null;
    } catch {
      return null;
    }
  };

  const geo = (await geocode()) ?? {};
  let suggestion = await searchTop(address);
  if (
    !suggestion &&
    (geo as GeocodeResponse)?.label &&
    (geo as GeocodeResponse)!.label !== address
  ) {
    suggestion = await searchTop((geo as GeocodeResponse)!.label as string);
  }

  const merged: AddressData = {
    lat: (geo as AddressData).lat ?? suggestion?.lat ?? NaN,
    lng: (geo as AddressData).lng ?? suggestion?.lng ?? NaN,
    label: (geo as AddressData).label ?? suggestion?.label ?? address,
    city: (geo as AddressData).city ?? suggestion?.city,
    postcode: (geo as AddressData).postcode ?? suggestion?.postcode,
    country: (geo as AddressData).country ?? suggestion?.country,
    street: (geo as AddressData).street,
    name: (geo as AddressData).name,
  };

  const parsed = parseAddressParts(merged.label);
  merged.postcode = merged.postcode ?? parsed.cp;
  merged.city = merged.city ?? parsed.city;
  merged.street = merged.street ?? parsed.street;
  merged.streetNumber = parsed.streetNumber;
  return merged;
}
