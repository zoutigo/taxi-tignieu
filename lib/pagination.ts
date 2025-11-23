export type PaginationResult<T> = {
  items: T[];
  totalPages: number;
  currentPage: number;
};

export function paginateArray<T>(data: T[], page: number, pageSize: number): PaginationResult<T> {
  const safeSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(data.length / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safeSize;
  const end = start + safeSize;
  return {
    items: data.slice(start, end),
    totalPages,
    currentPage: safePage,
  };
}

const STORAGE_KEY = "dashboard.pagination";

export type PaginationSettings = {
  bookings: number;
  avis: number;
  users: number;
};

const defaultSettings: PaginationSettings = {
  bookings: 10,
  avis: 10,
  users: 10,
};

export function loadPaginationSettings(): PaginationSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<PaginationSettings>;
    return {
      bookings: parsed.bookings && parsed.bookings > 0 ? parsed.bookings : defaultSettings.bookings,
      avis: parsed.avis && parsed.avis > 0 ? parsed.avis : defaultSettings.avis,
      users: parsed.users && parsed.users > 0 ? parsed.users : defaultSettings.users,
    };
  } catch {
    return defaultSettings;
  }
}

export function savePaginationSettings(next: PaginationSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export { defaultSettings as paginationDefaults };
