"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { ReservationPolicyConsent } from "@/components/reservation-policy-consent";
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
  type AddressData,
} from "@/lib/booking-utils";
import { normalizeAddressSuggestion } from "@/lib/address-search";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { userAddressSchema } from "@/schemas/profile";
import type { ZodIssue } from "zod";

export type SavedAddressOption = {
  id: string;
  label: string;
  addressLine: string;
  address: AddressData;
  isDefault?: boolean;
};

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

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  mode?: "create" | "edit";
  bookingId?: number;
  initialValues?: Partial<BookingEstimateInput>;
  initialPrice?: number | null;
  successRedirect?: string;
  useStore?: boolean;
  savedAddresses?: SavedAddressOption[];
};

export function ReservationWizard({
  mode = "create",
  bookingId,
  initialValues,
  initialPrice = null,
  successRedirect = "/espace-client/bookings",
  useStore = true,
  savedAddresses = [],
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
  const [quotePrice, setQuotePrice] = useState<number | null>(initialPrice);
  const [quoteDistance, setQuoteDistance] = useState<string>("");
  const [quoteDuration, setQuoteDuration] = useState<string>("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [tariffConfig, setTariffConfig] = useState<TariffConfigValues>(defaultTariffConfig);
  const savedSelectionRef = useRef<{ pickup: boolean; dropoff: boolean }>({
    pickup: false,
    dropoff: false,
  });
  const [suppressTokens, setSuppressTokens] = useState({ pickup: 0, dropoff: 0 });
  const [addressMode, setAddressMode] = useState<{
    pickup: "saved" | "manual";
    dropoff: "saved" | "manual";
  }>({
    pickup: savedAddresses.length ? "saved" : "manual",
    dropoff: savedAddresses.length ? "saved" : "manual",
  });
  const [shouldSaveAddress, setShouldSaveAddress] = useState<{ pickup: boolean; dropoff: boolean }>(
    {
      pickup: false,
      dropoff: false,
    }
  );
  const [saveLabels, setSaveLabels] = useState<{ pickup: string; dropoff: string }>({
    pickup: "",
    dropoff: "",
  });
  const [step, setStep] = useState<WizardStep>(0);
  const [maxStepVisited, setMaxStepVisited] = useState<number>(0);
  const lastQuoteKeyRef = useRef<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const form = useForm<BookingEstimateInput>({
    resolver: zodResolver(bookingEstimateSchema),
    mode: "onChange",
    defaultValues,
  });

  const pickupAddress = useWatch({ control: form.control, name: "pickup" }) as AddressData;
  const dropoffAddress = useWatch({ control: form.control, name: "dropoff" }) as AddressData;

  const saveLabelMissing =
    (shouldSaveAddress.pickup && saveLabels.pickup.trim().length < 2) ||
    (shouldSaveAddress.dropoff && saveLabels.dropoff.trim().length < 2);

  const formatZodError = (issues: ZodIssue[]) => {
    const issue = issues[0];
    if (!issue) return "Certains champs sont incomplets.";
    const field = Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "champ";
    return `${field}: ${issue.message}`;
  };

  const validateStepAddress = useCallback(
    (kind: "pickup" | "dropoff") => {
      const addr = form.getValues(kind) as AddressData;
      const parsed = addressStepSchema.safeParse(addr);
      if (!parsed.success) {
        setError(formatZodError(parsed.error.issues));
        return false;
      }
      return true;
    },
    [form]
  );

  const isAddressReady = useCallback((addr?: AddressData) => {
    if (!addr) return false;
    return (
      Boolean(addr.label?.trim()) &&
      Number.isFinite(addr.lat) &&
      Number.isFinite(addr.lng) &&
      Boolean(addr.postcode?.trim()) &&
      Boolean(addr.street?.trim()) &&
      Boolean(addr.city?.trim()) &&
      Boolean(addr.country?.trim())
    );
  }, []);

  const pickupReady = useMemo(() => isAddressReady(pickupAddress), [isAddressReady, pickupAddress]);
  const dropoffReady = useMemo(
    () => isAddressReady(dropoffAddress),
    [isAddressReady, dropoffAddress]
  );

  const renderSaveCheckbox = (kind: "pickup" | "dropoff") => {
    const ready = kind === "pickup" ? pickupReady : dropoffReady;
    if (addressMode[kind] !== "manual" || !ready) return null;
    const toneClass =
      kind === "pickup" ? "border-amber-200/80 bg-amber-50/70" : "border-sky-200/80 bg-sky-50/70";
    return (
      <div className={cn("space-y-2 rounded-xl p-3", toneClass)}>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={shouldSaveAddress[kind]}
            onCheckedChange={(checked) => {
              const next = Boolean(checked);
              setShouldSaveAddress((prev) => ({ ...prev, [kind]: next }));
              if (!next) {
                setSaveLabels((prev) => ({ ...prev, [kind]: "" }));
              }
            }}
            className="mt-0.5 h-5 w-5 cursor-pointer border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">Enregistrer cette adresse</p>
            <p className="text-xs text-muted-foreground">
              Ajoutez-la à vos adresses favorites pour vos prochains trajets.
            </p>
          </div>
        </div>
        {shouldSaveAddress[kind] ? (
          <Input
            value={saveLabels[kind]}
            aria-label="Nom pour cette adresse"
            onChange={(e) => setSaveLabels((prev) => ({ ...prev, [kind]: e.target.value }))}
            placeholder="Nom pour cette adresse (ex. Maison, École)"
            className="bg-white"
          />
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    form.reset(defaultValues);
    if (useStore) {
      clearBookingEstimate();
    }
    setQuoteDistance("");
    setQuoteDuration("");
  }, [defaultValues, form, useStore]);

  useEffect(() => {
    if (step > 0) {
      const firstInput = formRef.current?.querySelector("input");
      firstInput?.focus({ preventScroll: false });
    }
  }, [step]);

  useEffect(() => {
    setIsHydrated(true);
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

  const applyAddress = useCallback(
    (kind: "pickup" | "dropoff", addr: AddressData) => {
      const sanitized: AddressData = {
        ...addr,
        label: addr.label ?? "",
        street: addr.street ?? "",
        streetNumber: addr.streetNumber ?? "",
        postcode: addr.postcode ?? "",
        city: addr.city ?? "",
        country: addr.country ?? "",
        name: addr.name ?? undefined,
        lat: typeof addr.lat === "number" && Number.isFinite(addr.lat) ? addr.lat : NaN,
        lng: typeof addr.lng === "number" && Number.isFinite(addr.lng) ? addr.lng : NaN,
      };
      form.setValue(kind, sanitized, { shouldValidate: true, shouldDirty: true });
    },
    [form]
  );

  const clearAddress = useCallback(
    (kind: "pickup" | "dropoff") => {
      const empty: AddressData = {
        label: "",
        lat: NaN,
        lng: NaN,
        street: "",
        streetNumber: "",
        postcode: "",
        city: "",
        country: "",
      };
      savedSelectionRef.current[kind] = false;
      setShouldSaveAddress((prev) => ({ ...prev, [kind]: false }));
      setSaveLabels((prev) => ({ ...prev, [kind]: "" }));
      applyAddress(kind, empty);
    },
    [applyAddress]
  );

  const handleAddressInput = (kind: "pickup" | "dropoff", value: string) => {
    const current = form.getValues(kind) as AddressData;
    const next: AddressData = {
      ...current,
      label: value,
      lat: NaN,
      lng: NaN,
      street: "",
      streetNumber: "",
      postcode: "",
      city: "",
      country: "",
    };
    savedSelectionRef.current[kind] = false;
    setShouldSaveAddress((prev) => ({ ...prev, [kind]: false }));
    form.setValue(kind, next, { shouldValidate: false, shouldDirty: true });
  };

  const ensureAddress = useCallback(
    async (kind: "pickup" | "dropoff"): Promise<AddressData> => {
      const current = form.getValues(kind) as AddressData;
      if (savedSelectionRef.current[kind]) {
        if (!Number.isFinite(current.lat) || !Number.isFinite(current.lng)) {
          throw new Error("Adresse sauvegardée invalide. Vérifiez vos coordonnées.");
        }
        return current;
      }
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
    const addr = normalizeAddressSuggestion(s);
    savedSelectionRef.current[kind] = false;
    setShouldSaveAddress((prev) => ({ ...prev, [kind]: addressMode[kind] === "manual" }));
    applyAddress(kind, addr);
  };

  const handleSavedAddressSelect = (kind: "pickup" | "dropoff", id: string) => {
    const option = savedAddresses?.find((opt) => opt.id === id);
    if (!option) return;
    const addr: AddressData = {
      ...option.address,
      label: option.addressLine,
    };
    savedSelectionRef.current[kind] = true;
    setSuppressTokens((prev) => ({ ...prev, [kind]: prev[kind] + 1 }));
    setAddressMode((prev) => ({ ...prev, [kind]: "saved" }));
    setShouldSaveAddress((prev) => ({ ...prev, [kind]: false }));
    setSaveLabels((prev) => ({ ...prev, [kind]: "" }));
    applyAddress(kind, addr);
  };

  const saveAddressIfNeeded = useCallback(
    async (kind: "pickup" | "dropoff", addr: AddressData) => {
      if (!shouldSaveAddress[kind] || savedSelectionRef.current[kind]) return;
      if (sessionStatus !== "authenticated") return;
      if (!isAddressReady(addr)) return;

      const userLabel = saveLabels[kind]?.trim();
      const cleanLabel = addr.label?.trim();
      const cleanName = addr.name?.toString().trim();
      const payload = {
        label:
          userLabel && userLabel.length >= 2
            ? userLabel.slice(0, 50)
            : cleanLabel && cleanLabel.length > 0
              ? cleanLabel.slice(0, 50)
              : kind === "pickup"
                ? "Adresse de départ"
                : "Adresse d'arrivée",
        streetNumber: addr.streetNumber ?? "",
        street: addr.street ?? "",
        postalCode: addr.postcode ?? "",
        city: addr.city ?? "",
        country: addr.country ?? "",
        latitude: addr.lat ?? null,
        longitude: addr.lng ?? null,
        setDefault: false,
      };

      if (cleanName && cleanName.length > 0) {
        (payload as { name?: string }).name = cleanName;
      }
      // éviter d'envoyer name null/undefined
      if ((payload as { name?: unknown }).name == null) {
        delete (payload as { name?: unknown }).name;
      }

      const clientValidation = userAddressSchema
        .extend({ setDefault: z.boolean().optional() })
        .safeParse(payload);
      if (!clientValidation.success) {
        throw new Error(formatZodError(clientValidation.error.issues));
      }

      const res = await fetch("/api/profile/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientValidation.data),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error;
        throw new Error(message ?? "Impossible d'enregistrer cette adresse.");
      }
    },
    [isAddressReady, saveLabels, sessionStatus, shouldSaveAddress]
  );

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
    if (step !== 3) return;
    const quoteKey = JSON.stringify({
      date: watchedDate,
      time: watchedTime,
      passengers: watchedPassengers,
      luggage: watchedLuggage,
      pickupLabel: (watchedPickup as AddressData | undefined)?.label,
      pickupLat: (watchedPickup as AddressData | undefined)?.lat,
      pickupLng: (watchedPickup as AddressData | undefined)?.lng,
      dropoffLabel: (watchedDropoff as AddressData | undefined)?.label,
      dropoffLat: (watchedDropoff as AddressData | undefined)?.lat,
      dropoffLng: (watchedDropoff as AddressData | undefined)?.lng,
    });

    if (quoteKey === lastQuoteKeyRef.current) return;
    lastQuoteKeyRef.current = quoteKey;
    void calculateQuote();
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
    const parsedAll = bookingEstimateSchema.safeParse(data);
    if (!parsedAll.success) {
      setError(formatZodError(parsedAll.error.issues));
      return;
    }
    if (saveLabelMissing) {
      setError("Ajoutez un nom pour l'adresse à enregistrer.");
      return;
    }
    const priceToUse = quotePrice ?? storePrice ?? 0;
    let pickup: AddressData | null = null;
    let dropoff: AddressData | null = null;

    try {
      pickup = await ensureAddress("pickup");
      dropoff = await ensureAddress("dropoff");
      await Promise.all([
        saveAddressIfNeeded("pickup", pickup),
        saveAddressIfNeeded("dropoff", dropoff),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer l'adresse.");
      return;
    }

    const payload: BookingEstimateInput = { ...data, pickup, dropoff };
    if (useStore) setBookingEstimate(payload, priceToUse);

    await createBooking(payload, priceToUse);
    setSuccessMessage(
      mode === "edit"
        ? "Votre modification est enregistrée. Redirection en cours..."
        : "Votre demande est enregistrée ! Redirection en cours..."
    );
    updateStep(6);
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
      if (!validateStepAddress("pickup")) {
        setError("Adresse de départ invalide.");
        return;
      }
      updateStep(2);
      return;
    }
    if (step === 2) {
      const drop = await ensureAddress("dropoff");
      const parsed = addressStepSchema.safeParse(drop);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Adresse d'arrivée invalide.");
        return;
      }
      if (!validateStepAddress("dropoff")) {
        setError("Adresse d'arrivée invalide.");
        return;
      }
      updateStep(3);
      return;
    }
    if (step === 3) {
      updateStep(4);
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
      updateStep(5);
      return;
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated" && step === 4) {
      const hasPhone =
        typeof (session.data?.user as { phone?: string } | undefined)?.phone === "string" &&
        ((session.data?.user as { phone?: string }).phone?.trim().length ?? 0) > 0;
      if (hasPhone) {
        updateStep(5);
      }
    }
  }, [sessionStatus, session.data, step]);

  const steps = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  const priceDisplay = quotePrice ?? (isHydrated ? storePrice : null) ?? initialPrice ?? "—";

  const updateStep = (target: WizardStep) => {
    setStep(target);
    setMaxStepVisited((prev) => Math.max(prev, Math.min(target, 5)));
  };

  const startReservation = () => {
    updateStep(1);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleStepClick = (target: WizardStep) => {
    if (target > maxStepVisited) return;
    updateStep(target);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
      {step === 0 ? (
        <section className="flex flex-col gap-4">
          <div className="rounded-[28px] border border-border/70 bg-gradient-to-br from-sidebar to-sidebar/85 px-6 py-7 text-sidebar-foreground shadow-[0_35px_65px_rgba(2,8,28,0.35)]">
            <div className="mt-5 space-y-3">
              <h1 className="font-display text-3xl text-white">
                {mode === "edit" ? "Modifier votre trajet" : "Réservez votre trajet"}
              </h1>
              <p className="text-base text-white/80">
                Renseignez vos points de prise en charge et d&apos;arrivée, obtenez votre estimation
                puis confirmez la demande en quelques étapes.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                <p className="text-xl font-semibold">{priceDisplay} €</p>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">Tarif estimé</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                <p className="text-xl font-semibold">15 min</p>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">
                  Réponse moyenne
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                <p className="text-xl font-semibold">4.9/5</p>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">Satisfaction</p>
              </div>
            </div>
            <div className="mt-5 text-sm text-white/75">
              Pas encore d&apos;estimation ? Saisissez vos adresses ci-dessous et lancez le calcul.
            </div>
          </div>

          <Button
            type="button"
            onClick={startReservation}
            className="cursor-pointer w-full rounded-2xl border border-border/80 bg-primary px-5 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-fit"
          >
            {mode === "edit" ? "Modifier la réservation" : "Commencer la réservation"}
          </Button>

          <div className="rounded-[28px] border border-border/80 bg-card p-8 shadow-[0_35px_55px_rgba(5,15,35,0.1)]">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Conseils
            </p>
            <div className="mt-6 space-y-5 text-sm text-muted-foreground">
              <p>
                • Vérifiez que vos coordonnées correspondent exactement au point de rendez-vous.
              </p>
              <p>• Pour les trajets aéroport, indiquez votre numéro de vol dans les notes.</p>
              <p>• Nous confirmons chaque demande par téléphone ou par e-mail sous 15 minutes.</p>
            </div>
            <div className="mt-8 rounded-2xl border border-border/70 bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
              Une question ? Appelez le{" "}
              <a href="tel:+33495785400" className="cursor-pointer font-semibold text-primary">
                04 95 78 54 00
              </a>
              .
            </div>
          </div>
        </section>
      ) : null}

      {step > 0 ? (
        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <Form {...form}>
            <form className="card space-y-4" onSubmit={onSubmit} ref={formRef}>
              <div className="flex w-full items-stretch gap-2 sm:gap-3">
                {steps.map((s, idx) => {
                  const isCurrent = step === s.id || (step > steps.length && s.id === steps.length);
                  const isCompleted = step > s.id;
                  const isEnabled = s.id <= maxStepVisited;

                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => handleStepClick(s.id as WizardStep)}
                      className={cn(
                        "relative block h-4 w-full overflow-hidden rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/60 sm:h-5",
                        idx > 0 && "ml-[-6px] sm:ml-[-8px]",
                        isEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                        isCurrent && "h-5 sm:h-6"
                      )}
                      aria-label={`Aller à l'étape ${s.id}`}
                      disabled={!isEnabled}
                    >
                      <span
                        className={cn(
                          "absolute inset-0 block transition-[background-color,width]",
                          "bg-muted",
                          isCompleted && "bg-emerald-500",
                          isCurrent && "bg-primary"
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Départ</div>
                  <div className="space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Adresse de départ
                    </p>
                    {savedAddresses.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-amber-800">
                        <button
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1 transition",
                            addressMode.pickup === "saved"
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-white/80 text-amber-800 border border-amber-200"
                          )}
                          onClick={() => {
                            setAddressMode((prev) => ({ ...prev, pickup: "saved" }));
                            setShouldSaveAddress((prev) => ({ ...prev, pickup: false }));
                            setSuppressTokens((prev) => ({ ...prev, pickup: prev.pickup + 1 }));
                          }}
                        >
                          Mes adresses
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1 transition",
                            addressMode.pickup === "manual"
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-white/80 text-amber-800 border border-amber-200"
                          )}
                          onClick={() => {
                            setAddressMode((prev) => ({ ...prev, pickup: "manual" }));
                            savedSelectionRef.current.pickup = false;
                            setShouldSaveAddress((prev) => ({ ...prev, pickup: false }));
                            clearAddress("pickup");
                          }}
                        >
                          Saisir une adresse
                        </button>
                      </div>
                    ) : null}

                    {addressMode.pickup === "saved" && savedAddresses.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-amber-200/80 bg-white/70 p-3">
                        <Select
                          onValueChange={(value) => handleSavedAddressSelect("pickup", value)}
                        >
                          <SelectTrigger
                            className="cursor-pointer"
                            aria-label="Choisir une adresse sauvegardée"
                          >
                            <SelectValue placeholder="Choisir une de mes adresses favorites" />
                          </SelectTrigger>
                          <SelectContent>
                            {savedAddresses.map((addr) => (
                              <SelectItem
                                key={addr.id}
                                value={addr.id}
                                className="cursor-pointer data-[state=checked]:bg-primary/15 data-[state=checked]:text-foreground"
                              >
                                <div className="flex flex-col text-left">
                                  <span className="text-sm font-semibold text-foreground">
                                    {addr.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {addr.addressLine}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="pickup.label"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <AddressAutocomplete
                                value={field.value ?? ""}
                                placeholder="Ex: 114B route de Crémieu, Tignieu"
                                onChange={(val) => {
                                  field.onChange(val);
                                  handleAddressInput("pickup", val);
                                }}
                                onSelect={(addr) => pickSuggestion(addr, "pickup")}
                                suppressToken={suppressTokens.pickup}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {addressMode.pickup === "manual" ? (
                      <>
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
                        {renderSaveCheckbox("pickup")}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Arrivée</div>
                  <div className="space-y-3 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                      Adresse d&apos;arrivée
                    </p>
                    {savedAddresses.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-sky-800">
                        <button
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1 transition",
                            addressMode.dropoff === "saved"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-white/80 text-sky-800 border border-sky-200"
                          )}
                          onClick={() => {
                            setAddressMode((prev) => ({ ...prev, dropoff: "saved" }));
                            setShouldSaveAddress((prev) => ({ ...prev, dropoff: false }));
                            setSuppressTokens((prev) => ({ ...prev, dropoff: prev.dropoff + 1 }));
                          }}
                        >
                          Mes adresses
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1 transition",
                            addressMode.dropoff === "manual"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-white/80 text-sky-800 border border-sky-200"
                          )}
                          onClick={() => {
                            setAddressMode((prev) => ({ ...prev, dropoff: "manual" }));
                            savedSelectionRef.current.dropoff = false;
                            setShouldSaveAddress((prev) => ({ ...prev, dropoff: false }));
                            clearAddress("dropoff");
                          }}
                        >
                          Saisir une adresse
                        </button>
                      </div>
                    ) : null}

                    {addressMode.dropoff === "saved" && savedAddresses.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-sky-200/80 bg-white/70 p-3">
                        <Select
                          onValueChange={(value) => handleSavedAddressSelect("dropoff", value)}
                        >
                          <SelectTrigger
                            className="cursor-pointer"
                            aria-label="Choisir une adresse sauvegardée"
                          >
                            <SelectValue placeholder="Choisir une de mes adresses favorites" />
                          </SelectTrigger>
                          <SelectContent>
                            {savedAddresses.map((addr) => (
                              <SelectItem
                                key={addr.id}
                                value={addr.id}
                                className="cursor-pointer data-[state=checked]:bg-primary/15 data-[state=checked]:text-foreground"
                              >
                                <div className="flex flex-col text-left">
                                  <span className="text-sm font-semibold text-foreground">
                                    {addr.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {addr.addressLine}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="dropoff.label"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <AddressAutocomplete
                                value={field.value ?? ""}
                                placeholder="Ex: Aéroport de Lyon"
                                onChange={(val) => {
                                  field.onChange(val);
                                  handleAddressInput("dropoff", val);
                                }}
                                onSelect={(addr) => pickSuggestion(addr, "dropoff")}
                                suppressToken={suppressTokens.dropoff}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {addressMode.dropoff === "manual" ? (
                      <>
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
                        {renderSaveCheckbox("dropoff")}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-sm font-medium text-muted-foreground">
                    Estimation du tarif
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
                        {priceDisplay} €
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
                  <div className="text-sm font-medium text-muted-foreground">Connexion</div>
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
                  <div className="text-sm font-medium text-muted-foreground">Confirmation</div>
                  <FormField
                    control={form.control}
                    name="policiesAccepted"
                    render={({ field }) => <ReservationPolicyConsent field={field} />}
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
                      !form.watch("policiesAccepted") ||
                      saveLabelMissing
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
      ) : null}

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
