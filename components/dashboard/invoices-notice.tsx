"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = { message: string | null; durationMs?: number };

export function InvoicesNotice({ message, durationMs = 10000 }: Props) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  if (!message || !visible) return null;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
      )}
    >
      {message}
    </div>
  );
}
