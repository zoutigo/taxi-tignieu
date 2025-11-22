"use client";

import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";
import type { BookingEstimateInput } from "@/schemas/booking";

type BookingState = {
  estimate: BookingEstimateInput | null;
  estimatedPrice: number | null;
};

const STORAGE_KEY = "booking-store";

const initialState: BookingState =
  typeof window !== "undefined"
    ? (() => {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (!raw) return { estimate: null, estimatedPrice: null };
          const parsed = JSON.parse(raw) as BookingState;
          return {
            estimate: parsed.estimate ?? null,
            estimatedPrice: parsed.estimatedPrice ?? null,
          };
        } catch {
          return { estimate: null, estimatedPrice: null };
        }
      })()
    : { estimate: null, estimatedPrice: null };

const bookingStore = new Store<BookingState>(initialState);

function persist(state: BookingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function useBookingStore<T>(selector: (state: BookingState) => T) {
  return useStore(bookingStore, selector);
}

export function setBookingEstimate(data: BookingEstimateInput, price: number | null) {
  bookingStore.setState((state) => {
    const next = { ...state, estimate: data, estimatedPrice: price };
    persist(next);
    return next;
  });
}

export function clearBookingEstimate() {
  bookingStore.setState(() => {
    const next = { estimate: null, estimatedPrice: null };
    persist(next);
    return next;
  });
}
