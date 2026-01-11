"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchAddressSuggestions, normalizeAddressSuggestion } from "@/lib/address-search";
import type { AddressData } from "@/lib/booking-utils";

type Props = {
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  onSelect: (addr: AddressData) => void;
  disabled?: boolean;
  className?: string;
  suppressToken?: number;
  suppressInitial?: boolean;
};

export function AddressAutocomplete({
  value,
  placeholder,
  onChange,
  onSelect,
  disabled = false,
  className,
  suppressToken,
  suppressInitial = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressData[]>([]);
  const [loading, setLoading] = useState(false);
  const suppressNextFetchRef = useRef(false);
  const prevSuppressToken = useRef<number | undefined>(undefined);
  const firstRunRef = useRef(true);
  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    if (suppressInitial && firstRunRef.current) {
      suppressNextFetchRef.current = true;
      firstRunRef.current = false;
      prevSuppressToken.current = suppressToken;
    } else if (suppressToken !== prevSuppressToken.current) {
      suppressNextFetchRef.current = true;
      prevSuppressToken.current = suppressToken;
    }
    let active = true;
    const run = async () => {
      if (suppressInitial && !hasTyped) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      if (suppressNextFetchRef.current) {
        suppressNextFetchRef.current = false;
        setSuggestions([]);
        setLoading(false);
        return;
      }
      if (disabled || !value || value.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      const results = await fetchAddressSuggestions(value);
      if (active) setSuggestions(results);
      setLoading(false);
    };
    void run();
    return () => {
      active = false;
    };
  }, [value, disabled, suppressToken, suppressInitial, hasTyped]);

  const handleSelect = (addr: AddressData) => {
    const normalized = normalizeAddressSuggestion(addr);
    onSelect(normalized);
    suppressNextFetchRef.current = true;
    setLoading(false);
    setSuggestions([]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setHasTyped(true);
          onChange(e.target.value);
        }}
        autoComplete="street-address"
        className="text-base"
      />
      {loading ? <p className="text-xs text-muted-foreground">Recherche en cours...</p> : null}
      {suggestions.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-card shadow-lg">
          {suggestions.map((s, idx) => (
            <button
              type="button"
              key={`${s.label}-${s.lat}-${s.lng}-${idx}`}
              className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60"
              onClick={() => {
                handleSelect(s);
                setHasTyped(false);
              }}
            >
              <span className="mt-0.5 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">
                  {[s.streetNumber, s.street, s.postcode, s.city, s.country]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
