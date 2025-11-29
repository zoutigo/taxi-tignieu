"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingEstimateSchema } from "@/schemas/booking";
import type { BookingEstimateInput } from "@/schemas/booking";
import { useBookingStore, setBookingEstimate, clearBookingEstimate } from "@/hooks/useBookingStore";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { computePriceEuros, type TariffCode, baseChargeEuros } from "@/lib/tarifs";

export function ReservationPage() {
  const storedEstimate = useBookingStore((state) => state.estimate);
  const storedPrice = useBookingStore((state) => state.estimatedPrice);
  const defaultValues = useMemo<BookingEstimateInput>(
    () => ({
      pickup: storedEstimate?.pickup ?? "",
      dropoff: storedEstimate?.dropoff ?? "",
      date: storedEstimate?.date ?? "",
      time: storedEstimate?.time ?? "",
      passengers: storedEstimate?.passengers ?? 1,
      luggage: storedEstimate?.luggage ?? 0,
      notes: storedEstimate?.notes ?? "",
    }),
    [storedEstimate]
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [hasPosted, setHasPosted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isPostingRef = useRef(false);
  const [fromCity, setFromCity] = useState("");
  const [fromPostcode, setFromPostcode] = useState("");
  const [toCity, setToCity] = useState("");
  const [toPostcode, setToPostcode] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState<
    { label: string; city?: string; postcode?: string; lat: number; lng: number }[]
  >([]);
  const [toSuggestions, setToSuggestions] = useState<
    { label: string; city?: string; postcode?: string; lat: number; lng: number }[]
  >([]);
  const [quotePrice, setQuotePrice] = useState<number | null>(null);
  const [quoteDistance, setQuoteDistance] = useState<string>("");
  const [quoteDuration, setQuoteDuration] = useState<string>("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [readyToPost, setReadyToPost] = useState(false);

  const geocode = async (address: string) => {
    const res = await fetch(`/api/tarifs/geocode?q=${encodeURIComponent(address)}`);
    if (!res.ok) throw new Error("Adresse introuvable");
    return (await res.json()) as { lat: number; lng: number };
  };

  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
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

  const inferTariff = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return "A";
    const dt = new Date(`${dateStr}T${timeStr}`);
    const hour = dt.getHours();
    const isNight = hour < 7 || hour >= 19;
    const isWeekend = [0, 6].includes(dt.getDay());
    return isNight || isWeekend ? "B" : "A";
  };

  const createBooking = useCallback(
    async (payload: BookingEstimateInput) => {
      if (isPostingRef.current) {
        return;
      }
      isPostingRef.current = true;
      setError(null);
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, estimatedPrice: storedPrice ?? null }),
        });

        if (!res.ok) {
          const message =
            (await res.json().catch(() => ({}))).error ?? "Impossible de créer la réservation.";
          throw new Error(message);
        }

        setHasPosted(true);
        clearBookingEstimate();
        router.push("/espace-client?booking=success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      } finally {
        isPostingRef.current = false;
      }
    },
    [router, storedPrice]
  );

  const form = useForm<BookingEstimateInput>({
    resolver: zodResolver(bookingEstimateSchema),
    mode: "onChange",
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    const sp = searchParams;
    if (!sp) return;
    const pickup = sp.get("from") ?? defaultValues.pickup;
    const dropoff = sp.get("to") ?? defaultValues.dropoff;
    const price = Number(sp.get("price"));
    const distanceKm = sp.get("distanceKm");
    const durationMinutes = sp.get("durationMinutes");
    const tariff = sp.get("tariff");
    const baggage = sp.get("baggage");
    const fifthPassenger = sp.get("fifthPassenger");
    const waitMinutes = sp.get("waitMinutes");
    const fromCityVal = sp.get("fromCity") ?? "";
    const fromPostVal = sp.get("fromPostcode") ?? "";
    const toCityVal = sp.get("toCity") ?? "";
    const toPostVal = sp.get("toPostcode") ?? "";

    const extrasSummary = [
      tariff ? `Tarif: ${tariff}` : null,
      distanceKm ? `Distance estimée: ${distanceKm} km` : null,
      durationMinutes ? `Durée estimée: ${durationMinutes} min` : null,
      baggage ? `Bagages: ${baggage}` : null,
      fifthPassenger === "true" ? "5ᵉ passager" : null,
      waitMinutes ? `Attente: ${waitMinutes} min` : null,
      fromCityVal || fromPostVal ? `Départ: ${fromPostVal} ${fromCityVal}` : null,
      toCityVal || toPostVal ? `Arrivée: ${toPostVal} ${toCityVal}` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    const nextValues: BookingEstimateInput = {
      pickup,
      dropoff,
      date: defaultValues.date,
      time: defaultValues.time,
      passengers: defaultValues.passengers,
      luggage: defaultValues.luggage,
      notes: extrasSummary ? `${extrasSummary}` : defaultValues.notes,
    };

    setFromCity(fromCityVal);
    setFromPostcode(fromPostVal);
    setToCity(toCityVal);
    setToPostcode(toPostVal);
    if (distanceKm) setQuoteDistance(distanceKm);
    if (durationMinutes) setQuoteDuration(durationMinutes);

    form.reset(nextValues);
    if (!Number.isNaN(price) && price > 0) {
      setBookingEstimate(nextValues, price);
      setQuotePrice(price);
    } else {
      setBookingEstimate(nextValues, storedPrice ?? 0);
    }
  }, [defaultValues, form, searchParams, storedPrice]);

  useEffect(() => {
    const firstInput = formRef.current?.querySelector("input");
    firstInput?.focus({ preventScroll: false });
  }, []);

  const searchPhoton = async (text: string, kind: "from" | "to") => {
    if (text.length < 3) {
      if (kind === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/tarifs/search?q=${encodeURIComponent(text)}`);
      const data = (await res.json()) as {
        results?: { label: string; city?: string; postcode?: string; lat: number; lng: number }[];
      };
      if (kind === "from") setFromSuggestions(data.results ?? []);
      else setToSuggestions(data.results ?? []);
    } catch {
      if (kind === "from") setFromSuggestions([]);
      else setToSuggestions([]);
    }
  };

  const pickSuggestion = (
    s: { label: string; city?: string; postcode?: string; lat: number; lng: number },
    kind: "from" | "to"
  ) => {
    if (kind === "from") {
      form.setValue("pickup", s.label);
      setFromCity(s.city ?? "");
      setFromPostcode(s.postcode ?? "");
      setFromSuggestions([]);
    } else {
      form.setValue("dropoff", s.label);
      setToCity(s.city ?? "");
      setToPostcode(s.postcode ?? "");
      setToSuggestions([]);
    }
  };

  const calculateQuote = async () => {
    setQuoteLoading(true);
    setError(null);
    try {
      const values = form.getValues();
      const gFrom = await geocode(values.pickup);
      const gTo = await geocode(values.dropoff);
      const tariff = inferTariff(values.date, values.time);

      // Appel identique à la page /tarifs
      const res = await fetch("/api/tarifs/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: gFrom,
          to: gTo,
          tariff: tariff as TariffCode,
          baggageCount: values.luggage,
          fifthPassenger: values.passengers > 4,
          waitMinutes: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Calcul du tarif impossible.");
      }

      const apiDistance = Number(data.distanceKm);
      const apiDuration = Number(data.durationMinutes);
      const localDistance = haversineKm(gFrom, gTo);
      const distance =
        Number.isFinite(apiDistance) && apiDistance > 0 ? apiDistance : localDistance;
      if (!Number.isFinite(distance) || distance <= 0) throw new Error("Distance invalide");

      const durationMinutes =
        Number.isFinite(apiDuration) && apiDuration > 0
          ? Math.round(apiDuration)
          : Math.round((distance / 40) * 60);

      const finalPrice = computePriceEuros(distance, tariff as TariffCode, {
        baggageCount: values.luggage,
        fifthPassenger: values.passengers > 4,
        waitMinutes: 0,
      });

      setQuotePrice(finalPrice);
      setQuoteDistance(distance.toFixed(2));
      setQuoteDuration(durationMinutes > 0 ? String(durationMinutes) : "");
      setBookingEstimate({ ...values }, finalPrice);
    } catch (e) {
      setError("Erreur lors du calcul du tarif : " + String(e));
    } finally {
      setQuoteLoading(false);
    }
  };

  const onSubmit = form.handleSubmit(async (data: BookingEstimateInput) => {
    const priceToUse = quotePrice ?? storedPrice ?? 0;
    setBookingEstimate(data, priceToUse);
    setReadyToPost(true);

    if (sessionStatus === "authenticated") {
      await createBooking(data);
      setReadyToPost(false);
      return;
    }

    // Invite to login; booking will be posted on return thanks to persisted store
    await signIn("google", { callbackUrl: "/reserver" });
  });

  useEffect(() => {
    if (sessionStatus === "authenticated" && storedEstimate && !hasPosted && readyToPost) {
      void createBooking(storedEstimate);
      setReadyToPost(false);
    }
  }, [sessionStatus, storedEstimate, hasPosted, readyToPost, createBooking]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-border/70 bg-gradient-to-br from-sidebar to-sidebar/85 px-8 py-10 text-sidebar-foreground shadow-[0_45px_85px_rgba(2,8,28,0.45)]">
          <span className="badge-pill bg-white/10 text-white/85">Réservation 24/7</span>
          <div className="mt-6 space-y-4">
            <h1 className="font-display text-4xl text-white">Confirmez votre trajet</h1>
            <p className="text-lg text-white/80">
              Renseignez vos détails de prise en charge et laissez nos chauffeurs organiser le
              reste. Si vous n&apos;avez pas encore estimé votre tarif, rendez-vous sur la page
              Tarifs.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-2xl font-semibold">{storedPrice ? `${storedPrice} €` : "—"}</p>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Tarif estimé</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-2xl font-semibold">15 min</p>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Réponse moyenne</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-2xl font-semibold">4.9/5</p>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Satisfaction</p>
            </div>
          </div>
          <div className="mt-6 text-sm text-white/75">
            Pas encore d&apos;estimation ?{" "}
            <Link href="/tarifs" className="font-semibold text-primary">
              Voir les tarifs
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-border/80 bg-card p-8 shadow-[0_35px_55px_rgba(5,15,35,0.1)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Conseils
          </p>
          <div className="mt-6 space-y-5 text-sm text-muted-foreground">
            <p>• Vérifiez que vos coordonnées correspondent exactement au point de rendez-vous.</p>
            <p>• Pour les trajets aéroport, indiquez votre numéro de vol dans les notes.</p>
            <p>• Nous confirmons chaque demande par téléphone ou par e-mail sous 15 minutes.</p>
          </div>
          <div className="mt-8 rounded-2xl border border-border/70 bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
            Une question ? Appelez le{" "}
            <a href="tel:+33495785400" className="font-semibold text-primary">
              04 95 78 54 00
            </a>
            .
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <Form {...form}>
          <form className="card space-y-4" onSubmit={onSubmit} ref={formRef}>
            <div className="flex items-center gap-3">
              <span className="badge-pill bg-muted text-muted-foreground">Étape 2</span>
              <p className="text-sm font-medium text-muted-foreground">Confirmation</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Départ
                </p>
                <FormField
                  control={form.control}
                  name="pickup"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Ex: 114B route de Crémieu, Tignieu"
                          className="border-border/60 bg-white text-base text-foreground placeholder:text-muted-foreground"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            void searchPhoton(e.target.value, "from");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fromSuggestions.length > 0 && (
                  <div className="relative">
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
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
                )}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className="text-xs text-muted-foreground">Code postal</label>
                    <Input
                      readOnly
                      value={fromPostcode || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ville</label>
                    <Input readOnly value={fromCity || "Auto"} className="bg-muted/50 text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Arrivée
                </p>
                <FormField
                  control={form.control}
                  name="dropoff"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Ex: Aéroport de Lyon"
                          className="border-border/60 bg-white text-base text-foreground placeholder:text-muted-foreground"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            void searchPhoton(e.target.value, "to");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {toSuggestions.length > 0 && (
                  <div className="relative">
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
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
                )}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className="text-xs text-muted-foreground">Code postal</label>
                    <Input readOnly value={toPostcode || "Auto"} className="bg-muted/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ville</label>
                    <Input readOnly value={toCity || "Auto"} className="bg-muted/50 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="border-border/60 bg-white/90 text-base text-foreground dark:bg-card/70"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        className="border-border/60 bg-white/90 text-base text-foreground dark:bg-card/70"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="passengers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passagers</FormLabel>
                    <FormControl>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger className="w-full border-border/60 dark:bg-card/70">
                          <SelectValue placeholder="Nombre de passagers" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                            <SelectItem key={count} value={String(count)}>
                              {count} {count > 1 ? "passagers" : "passager"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="luggage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bagages</FormLabel>
                    <FormControl>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger className="w-full border-border/60 dark:bg-card/70">
                          <SelectValue placeholder="Nombre de bagages" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6].map((count) => (
                            <SelectItem key={count} value={String(count)}>
                              {count} {count > 1 ? "bagages" : "bagage"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Précisions, numéro de vol, options..."
                      className="border-border/60 bg-white/90 text-base text-foreground placeholder:text-muted-foreground dark:bg-card/70"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={calculateQuote}
                disabled={quoteLoading}
              >
                {quoteLoading ? "Calcul..." : "Calculer le tarif"}
              </Button>
              {quotePrice !== null ? (
                <span className="text-sm text-primary">
                  Estimation: {quotePrice.toFixed(2)} €{" "}
                  {quoteDistance ? `• ${quoteDistance} km` : ""}{" "}
                  {quoteDuration ? `• ${quoteDuration} min` : ""}
                </span>
              ) : error ? (
                <span className="text-sm text-destructive">{error}</span>
              ) : null}
            </div>

            <Button
              type="submit"
              className="btn btn-primary w-full"
              disabled={form.formState.isSubmitting || sessionStatus === "loading"}
            >
              {form.formState.isSubmitting ? "Enregistrement..." : "Confirmer ma demande"}
            </Button>
            {form.formState.isSubmitSuccessful && !error ? (
              <p className="text-center text-sm text-primary">
                Merci ! Votre demande est enregistrée. Elle apparaît dans votre espace client.
              </p>
            ) : null}
            {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
          </form>
        </Form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-border/80 bg-sidebar px-6 py-8 text-sidebar-foreground shadow-[0_35px_55px_rgba(2,8,32,0.3)]">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70">Assistance</p>
            <h2 className="mt-4 font-display text-2xl">Réservation assistée</h2>
            <p className="mt-3 text-sm text-white/80">
              Notre équipe vous répond 24/7 pour ajuster le trajet ou confirmer la réservation.
            </p>
            <div className="mt-6 space-y-2 text-sm text-white/90">
              <p>☎ 04 95 78 54 00</p>
              <p>✉ contact@taxitignieu.fr</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-card px-5 py-5 text-sm text-muted-foreground shadow-[0_20px_30px_rgba(5,15,35,0.08)]">
            <p className="font-semibold text-foreground">Délais moyens</p>
            <ul className="mt-3 space-y-2">
              <li>• Confirmation sous 15 min</li>
              <li>• Chauffeurs agréés CPAM</li>
              <li>• Suivi de course en temps réel</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
