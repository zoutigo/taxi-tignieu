"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { bookingEstimateSchema } from "@/schemas/booking";
import type { BookingEstimateInput } from "@/schemas/booking";
import { useBookingStore, setBookingEstimate, clearBookingEstimate } from "@/hooks/useBookingStore";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  computePriceEuros,
  type TariffCode,
  defaultTariffConfig,
  type TariffConfigValues,
} from "@/lib/tarifs";
import {
  fetchAddressData,
  haversineKm,
  inferTariffFromDateTime,
  parseAddressParts,
  type AddressData,
} from "@/lib/booking-utils";

const addressStepSchema = z.object({
  label: z.string().trim().min(3, "Adresse requise"),
  lat: z.number().finite("Coordonnées manquantes"),
  lng: z.number().finite("Coordonnées manquantes"),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  postcode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  name: z.string().optional(),
});

const scheduleSchema = z.object({
  date: z.string().min(1, "Sélectionnez une date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis."),
  passengers: z.number().int().min(1).max(7),
  luggage: z.number().int().min(0).max(6),
  notes: z.string().max(280).optional().or(z.literal("")),
});

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  mode?: "create" | "edit";
  bookingId?: number;
  initialValues?: Partial<BookingEstimateInput>;
  initialPrice?: number | null;
  successRedirect?: string;
  useStore?: boolean;
};

export function ReservationWizard({
  mode = "create",
  bookingId,
  initialValues,
  initialPrice = null,
  successRedirect = "/espace-client/bookings",
  useStore = true,
}: Props) {
  const storePrice = useBookingStore((state) => state.estimatedPrice);
  const defaultValues = useMemo<BookingEstimateInput>(() => {
    const emptyAddress: AddressData = {
      label: "",
      lat: NaN,
      lng: NaN,
      street: "",
      streetNumber: "",
      postcode: "",
      city: "",
      country: "",
    };
    return {
      pickup: { ...emptyAddress, ...(initialValues?.pickup ?? {}) },
      dropoff: { ...emptyAddress, ...(initialValues?.dropoff ?? {}) },
      date: initialValues?.date ?? "",
      time: initialValues?.time ?? "",
      passengers: initialValues?.passengers ?? 1,
      luggage: initialValues?.luggage ?? 0,
      notes: initialValues?.notes ?? "",
      policiesAccepted: initialValues?.policiesAccepted ?? false,
    };
  }, [initialValues]);

  const router = useRouter();
  const session = useSession();
  const { status: sessionStatus } = session;
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isPostingRef = useRef(false);
  const [fromSuggestions, setFromSuggestions] = useState<AddressData[]>([]);
  const [toSuggestions, setToSuggestions] = useState<AddressData[]>([]);
  const [quotePrice, setQuotePrice] = useState<number | null>(initialPrice);
  const [quoteDistance, setQuoteDistance] = useState<string>("");
  const [quoteDuration, setQuoteDuration] = useState<string>("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [tariffConfig, setTariffConfig] = useState<TariffConfigValues>(defaultTariffConfig);
  const [step, setStep] = useState<WizardStep>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<BookingEstimateInput>({
    resolver: zodResolver(bookingEstimateSchema),
    mode: "onChange",
    defaultValues,
  });

  const pickupAddress = form.watch("pickup") as AddressData;
  const dropoffAddress = form.watch("dropoff") as AddressData;

  useEffect(() => {
    form.reset(defaultValues);
    if (useStore) {
      clearBookingEstimate();
    }
    setFromSuggestions([]);
    setToSuggestions([]);
    setQuoteDistance("");
    setQuoteDuration("");
  }, [defaultValues, form, useStore]);

  useEffect(() => {
    const firstInput = formRef.current?.querySelector("input");
    firstInput?.focus({ preventScroll: false });
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/tarifs/config", { cache: "no-store" });
        if (!res.ok) return;
        const cfg = (await res.json()) as TariffConfigValues;
        setTariffConfig(cfg);
      } catch {
        // keep defaults
      }
    };
    void loadConfig();
  }, []);

  const searchSuggestions = async (text: string, kind: "pickup" | "dropoff") => {
    if (text.length < 3) {
      if (kind === "pickup") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/tarifs/search?q=${encodeURIComponent(text)}`);
      const data = (await res.json()) as { results?: AddressData[] };
      const normalized =
        data.results?.map((s) => {
          const parsed = parseAddressParts(s.label);
          const withCountry =
            s.country && !s.label.toLowerCase().includes(s.country.toLowerCase())
              ? `${s.label}, ${s.country}`
              : s.label;
          return {
            ...s,
            label: withCountry,
            city: s.city ?? parsed.city,
            postcode: s.postcode ?? parsed.cp,
            street: parsed.street,
            streetNumber: parsed.streetNumber,
          };
        }) ?? [];
      if (kind === "pickup") setFromSuggestions(normalized);
      else setToSuggestions(normalized);
    } catch {
      if (kind === "pickup") setFromSuggestions([]);
      else setToSuggestions([]);
    }
  };

  const applyAddress = useCallback(
    (kind: "pickup" | "dropoff", addr: AddressData) => {
      form.setValue(kind, addr, { shouldValidate: true, shouldDirty: true });
      if (kind === "pickup") setFromSuggestions([]);
      else setToSuggestions([]);
    },
    [form]
  );

  const handleAddressInput = (kind: "pickup" | "dropoff", value: string) => {
    const current = form.getValues(kind) as AddressData;
    const next: AddressData = { ...current, label: value, lat: NaN, lng: NaN };
    form.setValue(kind, next, { shouldValidate: false, shouldDirty: true });
    void searchSuggestions(value, kind);
  };

  const ensureAddress = useCallback(
    async (kind: "pickup" | "dropoff"): Promise<AddressData> => {
      const current = form.getValues(kind) as AddressData;
      if (Number.isFinite(current.lat) && Number.isFinite(current.lng)) {
        return current;
      }
      const fetched = await fetchAddressData(current.label);
      const merged: AddressData = {
        ...current,
        ...fetched,
      };
      applyAddress(kind, merged);
      return merged;
    },
    [applyAddress, form]
  );

  const pickSuggestion = (s: AddressData, kind: "pickup" | "dropoff") => {
    const parsed = parseAddressParts(s.label);
    const withCountry =
      s.country && !s.label.toLowerCase().includes(s.country.toLowerCase())
        ? `${s.label}, ${s.country}`
        : s.label;
    const addr: AddressData = {
      ...s,
      label: withCountry,
      city: s.city ?? parsed.city,
      postcode: s.postcode ?? parsed.cp,
      street: s.street ?? parsed.street,
      streetNumber: s.streetNumber ?? parsed.streetNumber,
    };
    applyAddress(kind, addr);
  };

  const createBooking = useCallback(
    async (payload: BookingEstimateInput, estimatedPrice: number | null) => {
      if (isPostingRef.current) {
        return;
      }
      isPostingRef.current = true;
      setError(null);
      try {
        const res = await fetch("/api/bookings", {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(mode === "edit" ? { id: bookingId } : {}),
            ...payload,
            estimatedPrice,
          }),
        });

        if (!res.ok) {
          const message =
            (await res.json().catch(() => ({}))).error ?? "Impossible de créer la réservation.";
          throw new Error(message);
        }

        if (useStore) clearBookingEstimate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
        throw err;
      } finally {
        isPostingRef.current = false;
      }
    },
    [bookingId, mode, useStore]
  );

  const calculateQuote = useCallback(async () => {
    const pickupValue = form.getValues("pickup");
    const dropValue = form.getValues("dropoff");
    const schedule = scheduleSchema.safeParse(form.getValues());
    if (!schedule.success) {
      return;
    }
    if (!pickupValue?.label || !dropValue?.label) {
      return;
    }
    setQuoteLoading(true);
    setError(null);
    try {
      const values = form.getValues();
      const gFrom = await ensureAddress("pickup");
      const gTo = await ensureAddress("dropoff");

      const fromParsed = addressStepSchema.safeParse(gFrom);
      const toParsed = addressStepSchema.safeParse(gTo);
      if (!fromParsed.success || !toParsed.success) {
        throw new Error("Coordonnées manquantes");
      }

      const tariff = inferTariffFromDateTime(values.date, values.time);

      const res = await fetch("/api/tarifs/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { lat: gFrom.lat, lng: gFrom.lng },
          to: { lat: gTo.lat, lng: gTo.lng },
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

      const apiPrice = Number(data.price);
      const finalPrice =
        Number.isFinite(apiPrice) && apiPrice > 0
          ? apiPrice
          : computePriceEuros(
              distance,
              tariff as TariffCode,
              {
                baggageCount: values.luggage,
                fifthPassenger: values.passengers > 4,
                waitMinutes: 0,
              },
              tariffConfig
            );

      setQuotePrice(finalPrice);
      setQuoteDistance(distance.toFixed(2));
      setQuoteDuration(durationMinutes > 0 ? String(durationMinutes) : "");
      if (useStore) {
        setBookingEstimate(
          {
            ...values,
            pickup: gFrom,
            dropoff: gTo,
          },
          finalPrice
        );
      }
    } catch (e) {
      setError("Erreur lors du calcul du tarif : " + String(e));
    } finally {
      setQuoteLoading(false);
    }
  }, [form, tariffConfig, useStore, ensureAddress]);

  const watchedDate = form.watch("date");
  const watchedTime = form.watch("time");
  const watchedPassengers = form.watch("passengers");
  const watchedLuggage = form.watch("luggage");
  const watchedPickup = form.watch("pickup");
  const watchedDropoff = form.watch("dropoff");

  useEffect(() => {
    if (step === 3) {
      void calculateQuote();
    }
  }, [
    step,
    watchedDate,
    watchedTime,
    watchedPassengers,
    watchedLuggage,
    watchedPickup,
    watchedDropoff,
    calculateQuote,
  ]);

  const onSubmit = form.handleSubmit(async (data: BookingEstimateInput) => {
    const priceToUse = quotePrice ?? storePrice ?? 0;
    const pickup = await ensureAddress("pickup");
    const dropoff = await ensureAddress("dropoff");
    const payload: BookingEstimateInput = { ...data, pickup, dropoff };
    if (useStore) setBookingEstimate(payload, priceToUse);

    await createBooking(payload, priceToUse);
    setSuccessMessage(
      mode === "edit"
        ? "Votre modification est enregistrée. Redirection en cours..."
        : "Votre demande est enregistrée ! Redirection en cours..."
    );
    setStep(6);
    setTimeout(() => {
      router.push(successRedirect);
    }, 1500);
  });

  const goToNext = async () => {
    setError(null);
    if (step === 1) {
      const pickup = await ensureAddress("pickup");
      const parsed = addressStepSchema.safeParse(pickup);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Adresse de départ invalide.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const drop = await ensureAddress("dropoff");
      const parsed = addressStepSchema.safeParse(drop);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Adresse d'arrivée invalide.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      await calculateQuote();
      setStep(4);
      return;
    }
    if (step === 4) {
      if (sessionStatus !== "authenticated") {
        await signIn("google", { callbackUrl: "/reserver" });
        return;
      }
      const hasPhone =
        typeof (session.data?.user as { phone?: string } | undefined)?.phone === "string" &&
        ((session.data?.user as { phone?: string }).phone?.trim().length ?? 0) > 0;
      if (!hasPhone) {
        setError("Ajoutez un numéro de téléphone dans votre profil pour continuer.");
        return;
      }
      setStep(5);
      return;
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated" && step === 4) {
      const hasPhone =
        typeof (session.data?.user as { phone?: string } | undefined)?.phone === "string" &&
        ((session.data?.user as { phone?: string }).phone?.trim().length ?? 0) > 0;
      if (hasPhone) {
        setStep(5);
      }
    }
  }, [sessionStatus, session.data, step]);

  const steps = [
    { id: 1, label: "Adresse de départ" },
    { id: 2, label: "Adresse d'arrivée" },
    { id: 3, label: "Estimation" },
    { id: 4, label: "Connexion" },
    { id: 5, label: "Confirmation" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-border/70 bg-gradient-to-br from-sidebar to-sidebar/85 px-8 py-10 text-sidebar-foreground shadow-[0_45px_85px_rgba(2,8,28,0.45)]">
          <span className="badge-pill bg-white/10 text-white/85">Réservation 24/7</span>
          <div className="mt-6 space-y-4">
            <h1 className="font-display text-4xl text-white">
              {mode === "edit" ? "Modifier votre trajet" : "Confirmez votre trajet"}
            </h1>
            <p className="text-lg text-white/80">
              Renseignez vos détails de prise en charge et laissez nos chauffeurs organiser le
              reste. Si vous n&apos;avez pas encore estimé votre tarif, rendez-vous sur la page
              Tarifs.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-2xl font-semibold">
                {quotePrice ?? storePrice ?? initialPrice ?? "—"} €
              </p>
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
            Pas encore d&apos;estimation ? Saisissez vos adresses ci-dessous et lancez le calcul.
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
            <div className="flex flex-wrap items-center gap-3">
              {steps.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                    step === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold">
                    {s.id}
                  </span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Étape 1 · Départ</div>
                <div className="space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Adresse de départ
                  </p>
                  <FormField
                    control={form.control}
                    name="pickup.label"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Ex: 114B route de Crémieu, Tignieu"
                            className="border-border/60 bg-white text-base text-foreground placeholder:text-muted-foreground"
                            value={pickupAddress?.label ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleAddressInput("pickup", e.target.value);
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
                        {fromSuggestions.map((s, idx) => (
                          <button
                            key={`${s.lat}-${s.lng}-${s.label}-${idx}`}
                            type="button"
                            className={cn(
                              "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-foreground",
                              "hover:bg-muted/60"
                            )}
                            onClick={() => pickSuggestion(s, "pickup")}
                          >
                            <span className="truncate">{s.label}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {[s.city, s.postcode, s.country].filter(Boolean).join(" • ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <Input
                      readOnly
                      value={pickupAddress?.street || pickupAddress?.streetNumber || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                    <Input
                      readOnly
                      value={pickupAddress?.postcode || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                    <Input
                      readOnly
                      value={pickupAddress?.city || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                    <Input
                      readOnly
                      value={pickupAddress?.country || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Étape 2 · Arrivée</div>
                <div className="space-y-3 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Adresse d&apos;arrivée
                  </p>
                  <FormField
                    control={form.control}
                    name="dropoff.label"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Ex: Aéroport de Lyon"
                            className="border-border/60 bg-white text-base text-foreground placeholder:text-muted-foreground"
                            value={dropoffAddress?.label ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleAddressInput("dropoff", e.target.value);
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
                        {toSuggestions.map((s, idx) => (
                          <button
                            key={`${s.lat}-${s.lng}-${s.label}-${idx}`}
                            type="button"
                            className={cn(
                              "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-foreground",
                              "hover:bg-muted/60"
                            )}
                            onClick={() => pickSuggestion(s, "dropoff")}
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
                    <Input
                      readOnly
                      value={dropoffAddress?.street || dropoffAddress?.streetNumber || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                    <Input
                      readOnly
                      value={dropoffAddress?.postcode || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                    <Input
                      readOnly
                      value={dropoffAddress?.city || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                    <Input
                      readOnly
                      value={dropoffAddress?.country || "Auto"}
                      className="bg-muted/50 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-sm font-medium text-muted-foreground">
                  Étape 3 · Estimation du tarif
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

                <div className="grid gap-4 sm:grid-cols-3">
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
                            <SelectTrigger className="border-border/60 bg-white text-base text-foreground">
                              <SelectValue placeholder="Nombre de passagers" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
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
                            <SelectTrigger className="border-border/60 bg-white text-base text-foreground">
                              <SelectValue placeholder="Nombre de bagages" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 7 }, (_, i) => i).map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            className="border-border/60 bg-white text-base text-foreground"
                            placeholder="Infos utiles : numéro de vol, digicode, etc."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Tarif estimé
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      {quotePrice ?? storePrice ?? initialPrice ?? "—"} €
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {quoteDistance ? `${quoteDistance} km` : ""}
                      {quoteDuration ? ` • ${quoteDuration} min` : ""}
                    </span>
                  </div>
                  {quoteLoading ? (
                    <span className="text-xs text-muted-foreground">Calcul...</span>
                  ) : null}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Étape 4 · Connexion</div>
                {sessionStatus !== "authenticated" ? (
                  <div className="rounded-2xl border border-border/80 bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
                    Connectez-vous pour continuer. Votre demande sera envoyée après connexion.
                    <div className="mt-4">
                      <Button
                        type="button"
                        className="cursor-pointer"
                        onClick={() => signIn("google", { callbackUrl: "/reserver" })}
                      >
                        Se connecter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
                    Vous êtes connecté.
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Étape 5 · Confirmation
                </div>
                <FormField
                  control={form.control}
                  name="policiesAccepted"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 rounded-2xl border border-border/80 bg-muted/30 px-4 py-3">
                      <FormControl>
                        <Checkbox
                          id="policiesAccepted"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="policiesAccepted"
                        className="text-sm font-medium text-muted-foreground"
                      >
                        Je confirme avoir pris connaissance de la{" "}
                        <Link
                          href="/politique-de-confidentialite"
                          className="text-primary underline"
                        >
                          politique de confidentialité
                        </Link>{" "}
                        et des{" "}
                        <Link href="/mentions-legales" className="text-primary underline">
                          mentions légales
                        </Link>
                        .
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {successMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                En cliquant, vous{" "}
                {mode === "edit"
                  ? "mettez à jour la réservation"
                  : "créez une demande de réservation"}
                . Nous la confirmons par e-mail ou SMS.
              </div>
              {step < 5 ? (
                <Button type="button" className="cursor-pointer" onClick={goToNext}>
                  Continuer
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="cursor-pointer"
                  disabled={
                    isPostingRef.current ||
                    sessionStatus !== "authenticated" ||
                    !form.watch("policiesAccepted")
                  }
                >
                  {isPostingRef.current
                    ? "Envoi..."
                    : mode === "edit"
                      ? "Enregistrer les modifications"
                      : "Confirmer ma demande"}
                </Button>
              )}
            </div>
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
    </div>
  );
}
