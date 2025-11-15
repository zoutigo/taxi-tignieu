"use client";

import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";
import type { BookingEstimateInput } from "@/schemas/booking";

type BookingState = {
  estimate: BookingEstimateInput | null;
  estimatedPrice: number | null;
};

const bookingStore = new Store<BookingState>({
  estimate: null,
  estimatedPrice: null,
});

export function useBookingStore<T>(selector: (state: BookingState) => T) {
  return useStore(bookingStore, selector);
}

export function setBookingEstimate(data: BookingEstimateInput, price: number | null) {
  bookingStore.setState((state) => ({
    ...state,
    estimate: data,
    estimatedPrice: price,
  }));
}

export function clearBookingEstimate() {
  bookingStore.setState(() => ({
    estimate: null,
    estimatedPrice: null,
  }));
}
