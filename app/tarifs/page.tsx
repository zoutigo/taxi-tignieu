"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TariffCode } from "@/lib/tarifs";
import { computePriceEuros } from "@/lib/tarifs";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type QuoteResponse = {
  distanceKm: number;
  durationMinutes: number;
  price: number;
  error?: string;
};

type Suggestion = { label: string; city?: string; postcode?: string; lat: number; lng: number };

const tariffLabels: Record<TariffCode, string> = {
  A: "Tarif A (jour semaine)",
  B: "Tarif B (nuit / dim / fériés)",
  C: "Tarif C (gare jour)",
  D: "Tarif D (gare nuit)",
};

export default function TarifsPage() {
  const router = useRouter();
  const [fromAddress, setFromAddress] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState<Suggestion[]>([]);
  const [toAddress, setToAddress] = useState("");
  const [toSuggestions, setToSuggestions] = useState<Suggestion[]>([]);
  const [fromLat, setFromLat] = useState("");
  const [fromLng, setFromLng] = useState("");
  const [toLat, setToLat] = useState("");
  const [toLng, setToLng] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [fromPostcode, setFromPostcode] = useState("");
  const [toCity, setToCity] = useState("");
  const [toPostcode, setToPostcode] = useState("");
  const [tariff, setTariff] = useState<TariffCode>("A");
  const [baggage, setBaggage] = useState(0);
  const [fifthPassenger, setFifthPassenger] = useState(false);
  const [waitMinutes, setWaitMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setSearchLoading] = useState(false);

  const geocode = async (text: string) => {
    const res = await fetch(`/api/tarifs/geocode?q=${encodeURIComponent(text)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Adresse introuvable");
    }
    return (await res.json()) as { lat: number; lng: number; label?: string };
  };

  const searchPhoton = async (text: string, kind: "from" | "to") => {
    if (text.length < 3) {
      if (kind === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/tarifs/search?q=${encodeURIComponent(text)}`);
      const data = (await res.json()) as { results?: Suggestion[] };
      if (kind === "from") setFromSuggestions(data.results ?? []);
      else setToSuggestions(data.results ?? []);
    } catch {
      if (kind === "from") setFromSuggestions([]);
      else setToSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const pickSuggestion = (s: Suggestion, kind: "from" | "to") => {
    if (kind === "from") {
      setFromAddress(s.label);
      setFromLat(String(s.lat));
      setFromLng(String(s.lng));
      setFromCity(s.city ?? "");
      setFromPostcode(s.postcode ?? "");
      setFromSuggestions([]);
    } else {
      setToAddress(s.label);
      setToLat(String(s.lat));
      setToLng(String(s.lng));
      setToCity(s.city ?? "");
      setToPostcode(s.postcode ?? "");
      setToSuggestions([]);
    }
  };

  const submit = async () => {
    setError(null);
    setQuote(null);
    setLoading(true);
    try {
      let from = { lat: Number(fromLat), lng: Number(fromLng) };
      let to = { lat: Number(toLat), lng: Number(toLng) };

      if (fromAddress) {
        const g = await geocode(fromAddress);
        from = { lat: g.lat, lng: g.lng };
        setFromLat(String(g.lat.toFixed(6)));
        setFromLng(String(g.lng.toFixed(6)));
      }
      if (toAddress) {
        const g = await geocode(toAddress);
        to = { lat: g.lat, lng: g.lng };
        setToLat(String(g.lat.toFixed(6)));
        setToLng(String(g.lng.toFixed(6)));
      }

      const res = await fetch("/api/tarifs/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          tariff,
          baggageCount: baggage,
          fifthPassenger,
          waitMinutes,
        }),
      });
      const data = (await res.json()) as QuoteResponse;
      if (!res.ok || data.error) {
        setError(data.error ?? "Impossible de calculer le tarif.");
      } else {
        const distance = Number(data.distanceKm);
        const priceFromApi = Number(data.price);
        const distanceOk = Number.isFinite(distance) && distance > 0;
        const finalPrice =
          distanceOk && priceFromApi > 0
            ? priceFromApi
            : distanceOk
              ? computePriceEuros(distance, tariff, {
                  baggageCount: baggage,
                  fifthPassenger,
                  waitMinutes,
                })
              : 0;

        setQuote({
          distanceKm: distanceOk ? Math.round(distance * 100) / 100 : 0,
          durationMinutes: data.durationMinutes,
          price: finalPrice,
          error: undefined,
        });
      }
    } catch (e) {
      setError("Erreur réseau : " + String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-r from-sidebar to-[#0b2958] px-6 py-6 text-white shadow-[0_20px_60px_rgba(6,13,45,0.35)]">
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">Tarifs</p>
        <h1 className="mt-2 font-display text-3xl leading-tight">Estimez votre course</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          Basé sur la tarification officielle (prise en charge 2,80 €, tarifs au km A-D, attente
          29,40 €/h, bagage 2 €, 5ᵉ passager 2,50 €). Saisissez vos coordonnées pour un calcul
          précis via OpenRouteService.
        </p>
      </div>

      <div className="grid gap-6 rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Départ</p>
            <Input
              placeholder="Ex: 114B route de Crémieu, Tignieu"
              value={fromAddress}
              onChange={(e) => {
                setFromAddress(e.target.value);
                void searchPhoton(e.target.value, "from");
              }}
            />
            {fromSuggestions.length > 0 ? (
              <div className="relative">
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
                  {fromSuggestions.map((s) => (
                    <button
                      key={`${s.lat}-${s.lng}-${s.label}`}
                      type="button"
                      className={cn(
                        "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-foreground",
                        "hover:bg-muted/60"
                      )}
                      onClick={() => pickSuggestion(s, "from")}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[s.city, s.postcode].filter(Boolean).join(" • ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label className="text-xs text-muted-foreground">Code postal</label>
                <Input value={fromPostcode} readOnly placeholder="Auto" className="bg-muted/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ville</label>
                <Input value={fromCity} readOnly placeholder="Auto" className="bg-muted/50" />
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-sky-200/60 bg-sky-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Arrivée</p>
            <Input
              placeholder="Ex: Aéroport de Lyon"
              value={toAddress}
              onChange={(e) => {
                setToAddress(e.target.value);
                void searchPhoton(e.target.value, "to");
              }}
            />
            {toSuggestions.length > 0 ? (
              <div className="relative">
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
                  {toSuggestions.map((s) => (
                    <button
                      key={`${s.lat}-${s.lng}-${s.label}`}
                      type="button"
                      className={cn(
                        "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-foreground",
                        "hover:bg-muted/60"
                      )}
                      onClick={() => pickSuggestion(s, "to")}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[s.city, s.postcode].filter(Boolean).join(" • ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label className="text-xs text-muted-foreground">Code postal</label>
                <Input value={toPostcode} readOnly placeholder="Auto" className="bg-muted/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ville</label>
                <Input value={toCity} readOnly placeholder="Auto" className="bg-muted/50" />
              </div>
            </div>
          </div>
        </div>

        <input type="hidden" value={fromLat} readOnly />
        <input type="hidden" value={fromLng} readOnly />
        <input type="hidden" value={toLat} readOnly />
        <input type="hidden" value={toLng} readOnly />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Tarif</label>
            <Select value={tariff} onValueChange={(v) => setTariff(v as TariffCode)}>
              <SelectTrigger>
                <SelectValue placeholder="Tarif" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(tariffLabels) as TariffCode[]).map((code) => (
                  <SelectItem key={code} value={code}>
                    {tariffLabels[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Bagages (nb)</label>
            <Input
              type="number"
              min={0}
              value={baggage}
              onChange={(e) => setBaggage(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Attente (minutes)</label>
            <Input
              type="number"
              min={0}
              value={waitMinutes}
              onChange={(e) => setWaitMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="fifth"
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={fifthPassenger}
            onChange={(e) => setFifthPassenger(e.target.checked)}
          />
          <label htmlFor="fifth" className="text-sm text-foreground">
            5ᵉ passager (+2,50 €)
          </label>
        </div>

        <Button onClick={submit} disabled={loading} className="w-full sm:w-fit">
          {loading ? "Calcul..." : "Calculer le tarif"}
        </Button>

        {error ? (
          <div className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>
        ) : null}
        {quote ? (
          <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              Prix estimé : <span className="text-primary">{quote.price.toFixed(2)} €</span>
            </p>
            <p className="text-muted-foreground">
              Distance {quote.distanceKm} km • Durée estimée {quote.durationMinutes} min
            </p>
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => {
                const params = new URLSearchParams({
                  from: fromAddress,
                  to: toAddress,
                  fromLat,
                  fromLng,
                  toLat,
                  toLng,
                  price: String(quote.price),
                  distanceKm: String(quote.distanceKm),
                  durationMinutes: String(quote.durationMinutes),
                  tariff,
                  baggage: String(baggage),
                  fifthPassenger: String(fifthPassenger),
                  waitMinutes: String(waitMinutes),
                });
                if (fromCity) params.set("fromCity", fromCity);
                if (fromPostcode) params.set("fromPostcode", fromPostcode);
                if (toCity) params.set("toCity", toCity);
                if (toPostcode) params.set("toPostcode", toPostcode);
                router.push(`/reserver?${params.toString()}`);
              }}
            >
              Réserver ce trajet
            </Button>
          </div>
        ) : null}
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-5 text-sm text-foreground shadow-sm">
        <h2 className="text-lg font-semibold">Résumé tarifaire (extrait panneau 2020)</h2>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>Prise en charge : 2,80 €</li>
          <li>Tarif A : 0,98 €/km (jour semaine 7h-19h) • Tarif B : 1,23 €/km (nuit/dim/fériés)</li>
          <li>Tarif C : 1,96 €/km (gare jour) • Tarif D : 2,46 €/km (gare nuit)</li>
          <li>Attente : 29,40 €/h (marche lente ou arrêt demandé)</li>
          <li>Suppléments : 5ᵉ passager 2,50 € • Bagage 2 €</li>
        </ul>
      </section>
    </main>
  );
}
