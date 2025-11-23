"use client";

import { useState } from "react";
import type { Booking, BookingStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BookingRow = Booking & {
  user?: { name: string | null; email: string | null } | null;
};

type Props = {
  initialBookings: BookingRow[];
};

export function BookingsAdminTable({ initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (b: BookingRow) => {
    setError(null);
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: b.id,
        pickup: b.pickup,
        dropoff: b.dropoff,
        notes: b.notes,
        status: b.status,
        priceCents: b.priceCents ?? undefined,
      }),
    });
    if (!res.ok) {
      setError("Impossible de sauvegarder la réservation.");
      return;
    }
    setMessage("Réservation mise à jour.");
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="space-y-3">
      {message ? (
        <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>
      ) : null}

      {bookings.map((b) => (
        <div key={b.id} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <div className="flex flex-wrap gap-2">
              <p className="font-semibold">
                {b.pickup} → {b.dropoff}
              </p>
              <p className="text-muted-foreground">{b.user?.name ?? "—"}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={b.pickup}
                onChange={(e) =>
                  setBookings((prev) =>
                    prev.map((bk) => (bk.id === b.id ? { ...bk, pickup: e.target.value } : bk))
                  )
                }
              />
              <Input
                value={b.dropoff}
                onChange={(e) =>
                  setBookings((prev) =>
                    prev.map((bk) => (bk.id === b.id ? { ...bk, dropoff: e.target.value } : bk))
                  )
                }
              />
              <Textarea
                className="sm:col-span-2"
                value={b.notes ?? ""}
                onChange={(e) =>
                  setBookings((prev) =>
                    prev.map((bk) => (bk.id === b.id ? { ...bk, notes: e.target.value } : bk))
                  )
                }
              />
              <Select
                value={b.status}
                onValueChange={(v) =>
                  setBookings((prev) =>
                    prev.map((bk) => (bk.id === b.id ? { ...bk, status: v as BookingStatus } : bk))
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => save(b)}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
