"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  message?: string | null;
  bookingId?: string | null;
  durationMs?: number;
};

export function InvoiceCreateBanner({ message, bookingId, durationMs = 10000 }: Props) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  if (!message || !visible) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900",
        "shadow-sm"
      )}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Facturation</p>
      <p>{message}</p>
      {bookingId ? <p className="text-emerald-800/80">Réservation : {bookingId}</p> : null}
    </div>
  );
}
