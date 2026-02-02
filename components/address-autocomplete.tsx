"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchAddressSuggestions,
  fetchForecastAddressSuggestions,
  normalizeAddressSuggestion,
} from "@/lib/address-search";
import type { AddressData } from "@/lib/booking-utils";
import { parseAddressParts } from "@/lib/booking-utils";

type Props = {
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  onSelect: (addr: AddressData) => void;
  disabled?: boolean;
  className?: string;
  suppressToken?: number;
  suppressInitial?: boolean;
  mode?: "legacy" | "forecast";
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
  mode = "forecast",
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressData[]>([]);
  const [loading, setLoading] = useState(false);
  const suppressNextFetchRef = useRef(false);
  const prevSuppressToken = useRef<number | undefined>(undefined);
  const firstRunRef = useRef(true);
  const [searchNonce, setSearchNonce] = useState(0);
  const [queryToSearch, setQueryToSearch] = useState("");

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
      if (searchNonce === 0) return;
      const minLen = mode === "forecast" ? 5 : 3;
      const q = queryToSearch.trim();
      if (disabled || !q || q.length < minLen) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const fetcher =
        mode === "forecast" ? fetchForecastAddressSuggestions : fetchAddressSuggestions;
      const results = await fetcher(q);
      if (process.env.NODE_ENV !== "production") {
        console.debug("AddressAutocomplete suggestions", { query: q, results });
      }
      if (active) setSuggestions(results);
      setLoading(false);
    };
    void run();
    return () => {
      active = false;
    };
  }, [mode, searchNonce, queryToSearch, disabled, suppressInitial, suppressToken]);

  const handleSelect = (addr: AddressData) => {
    const normalized = normalizeAddressSuggestion(addr, value);
    onSelect(normalized);
    suppressNextFetchRef.current = true;
    setLoading(false);
    setSuggestions([]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSuggestions([]);
            setLoading(false);
          }}
          autoComplete="street-address"
          className="text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setQueryToSearch(e.currentTarget.value);
              setSearchNonce((n) => n + 1);
            }
          }}
        />
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted"
          onClick={() => {
            setQueryToSearch(value);
            setSearchNonce((n) => n + 1);
          }}
          disabled={disabled || !value || value.trim().length < 5}
        >
          Rechercher
        </button>
      </div>
      {loading ? <p className="text-xs text-muted-foreground">Recherche en cours...</p> : null}
      {suggestions.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-card shadow-lg">
          {suggestions.map((s, idx) => {
            const parsed = parseAddressParts(s.label);
            const streetNumber = s.streetNumber || parsed.streetNumber;
            const street = s.street || parsed.street || s.label;
            const postcode = s.postcode || parsed.cp;
            const city = s.city || parsed.city;
            const line1 = [streetNumber, street].filter(Boolean).join(" ").trim();
            const line2 = [postcode, city].filter(Boolean).join(" ").trim();
            const primary = line1 || s.label;
            const secondary = [line2 || s.label, s.country].filter(Boolean).join(", ");

            return (
              <button
                type="button"
                key={`${s.label}-${s.lat}-${s.lng}-${idx}`}
                className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60"
                onClick={() => {
                  handleSelect(s);
                }}
              >
                <span className="mt-0.5 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{primary}</p>
                  <p className="text-xs text-muted-foreground">{secondary}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
