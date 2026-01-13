"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { computePriceEuros, defaultTariffConfig, type TariffConfigValues } from "@/lib/tarifs";
import { inferTariffFromDateTime } from "@/lib/booking-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z
  .object({
    amountEuros: z.preprocess(
      (v) => (typeof v === "string" ? Number(v.replace(",", ".")) : Number(v)),
      z.number().positive("Montant invalide")
    ),
    issuedAt: z.string(),
    pdfPath: z.string().optional(),
    bookingId: z.string().min(1, "Réservation requise"),
    realKm: z.number().optional(),
    estimatedLuggage: z.number().optional(),
    realLuggage: z.number().optional(),
    estimatedPax: z.number().optional(),
    realPax: z.number().optional(),
    sendToClient: z.boolean().optional(),
    waitHours: z.number().optional(),
    adjustmentComment: z.string().optional(),
    paid: z.boolean().optional(),
    paymentMethod: z.enum(["CB", "CASH", "PAYPAL", "BTC"]).optional(),
  })
  .refine(
    (data) => {
      if (data.paid === false) return true;
      return !data.paid || Boolean(data.paymentMethod);
    },
    { message: "Choisissez un moyen de paiement", path: ["paymentMethod"] }
  );

type FormValues = z.infer<typeof schema>;

type Props = {
  mode?: "edit" | "create";
  invoiceId?: string;
  defaultValues: {
    bookingId: string;
    amountEuros: number;
    issuedAt: string;
    pdfPath?: string | null;
    realKm?: number | null;
    estimatedLuggage?: number | null;
    realLuggage?: number | null;
    estimatedPax?: number | null;
    realPax?: number | null;
    sendToClient?: boolean | null;
    waitHours?: number | null;
    adjustmentComment?: string | null;
    paid?: boolean | null;
    paymentMethod?: "CB" | "CASH" | "PAYPAL" | "BTC" | null;
  };
  bookingSummary?: {
    id: string;
    pickup?: string | null;
    dropoff?: string | null;
    dateTime?: string | null;
    client: string;
    estimatedKm?: number | null;
    estimatedLuggage?: number | null;
    estimatedPax?: number | null;
    estimatedAmount?: number | null;
  };
};

export function InvoiceEditForm({
  invoiceId,
  defaultValues,
  mode = "edit",
  bookingSummary,
}: Props) {
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tariffConfig, setTariffConfig] = useState<TariffConfigValues | null>(null);
  const initialAmountRef = useRef(bookingSummary?.estimatedAmount ?? defaultValues.amountEuros);
  const defaultsRef = useRef({
    km: defaultValues.realKm ?? bookingSummary?.estimatedKm ?? 0,
    luggage: defaultValues.realLuggage ?? bookingSummary?.estimatedLuggage ?? 0,
    pax: defaultValues.realPax ?? bookingSummary?.estimatedPax ?? 1,
    wait: defaultValues.waitHours ?? 0,
    amount: defaultValues.amountEuros,
  });
  const hasInteractedRef = useRef(false);
  const lastChangeRef = useRef<"fields" | "amount" | null>(null);

  const resolved = zodResolver(schema) as unknown as Resolver<FormValues>;
  const form = useForm<FormValues>({
    resolver: (values, context, options) => resolved(values, context, options),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      bookingId: defaultValues.bookingId,
      amountEuros: defaultValues.amountEuros,
      issuedAt: defaultValues.issuedAt.slice(0, 16),
      pdfPath: defaultValues.pdfPath ?? "",
      realKm: defaultValues.realKm ?? undefined,
      estimatedLuggage: defaultValues.estimatedLuggage ?? undefined,
      realLuggage: defaultValues.realLuggage ?? defaultValues.estimatedLuggage ?? undefined,
      estimatedPax: defaultValues.estimatedPax ?? undefined,
      realPax: defaultValues.realPax ?? defaultValues.estimatedPax ?? undefined,
      sendToClient: defaultValues.sendToClient ?? true,
      waitHours: defaultValues.waitHours ?? 0,
      adjustmentComment: defaultValues.adjustmentComment ?? "",
      paid: defaultValues.paid ?? true,
      paymentMethod: defaultValues.paymentMethod ?? "CB",
    },
  });
  const [watchKm, watchLuggage, watchPax, watchWait] = form.watch([
    "realKm",
    "realLuggage",
    "realPax",
    "waitHours",
  ]);

  // Charger la config tarifaire (euros -> cents)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/settings/tarifs");
        if (!res.ok) throw new Error("Tarifs indisponibles");
        const data = await res.json();
        const cfg: TariffConfigValues = {
          baseChargeCents: Math.round(
            (data.baseCharge ?? defaultTariffConfig.baseChargeCents / 100) * 100
          ),
          kmCentsA: Math.round((data.kmA ?? defaultTariffConfig.kmCentsA / 100) * 100),
          kmCentsB: Math.round((data.kmB ?? defaultTariffConfig.kmCentsB / 100) * 100),
          kmCentsC: Math.round((data.kmC ?? defaultTariffConfig.kmCentsC / 100) * 100),
          kmCentsD: Math.round((data.kmD ?? defaultTariffConfig.kmCentsD / 100) * 100),
          waitPerHourCents: Math.round(
            (data.waitPerHour ?? defaultTariffConfig.waitPerHourCents / 100) * 100
          ),
          baggageFeeCents: Math.round(
            (data.baggageFee ?? defaultTariffConfig.baggageFeeCents / 100) * 100
          ),
          fifthPassengerCents: Math.round(
            (data.fifthPassenger ?? defaultTariffConfig.fifthPassengerCents / 100) * 100
          ),
        };
        setTariffConfig(cfg);
      } catch {
        setTariffConfig(defaultTariffConfig);
      }
    };
    loadConfig();
  }, []);

  // Recalcul du montant lorsque les champs évoluent
  useEffect(() => {
    if (!tariffConfig) return;
    const distance = watchKm ?? 0;
    const luggage = watchLuggage ?? 0;
    const pax = watchPax ?? 1;
    const waitHours = watchWait ?? 0;
    const defaults = defaultsRef.current;

    const isInitialSame =
      !hasInteractedRef.current &&
      distance === defaults.km &&
      luggage === defaults.luggage &&
      pax === defaults.pax &&
      waitHours === defaults.wait;
    if (isInitialSame) return;

    hasInteractedRef.current = true;
    lastChangeRef.current = "fields";

    const dateIso = bookingSummary?.dateTime;
    const dateStr = dateIso ? new Date(dateIso).toISOString().slice(0, 10) : "";
    const timeStr = dateIso ? new Date(dateIso).toISOString().slice(11, 16) : "";
    const tariff = inferTariffFromDateTime(dateStr, timeStr);

    const price = computePriceEuros(
      distance || 0,
      tariff,
      {
        baggageCount: luggage,
        fifthPassenger: pax > 4,
        waitMinutes: Math.max(0, waitHours * 60),
      },
      tariffConfig
    );

    form.setValue("amountEuros", price, { shouldValidate: true, shouldDirty: true });
    form.trigger("adjustmentComment");
  }, [bookingSummary?.dateTime, form, tariffConfig, watchKm, watchLuggage, watchPax, watchWait]);

  // Recalcule la distance si l'utilisateur modifie directement le montant
  const watchAmount = form.watch("amountEuros");
  useEffect(() => {
    if (!tariffConfig) return;
    // éviter la boucle quand on met à jour depuis les champs
    if (lastChangeRef.current === "fields") {
      lastChangeRef.current = null;
      return;
    }
    if (!hasInteractedRef.current && watchAmount === initialAmountRef.current) {
      return;
    }
    const amount = watchAmount;
    if (amount == null || Number.isNaN(amount)) return;

    const dateIso = bookingSummary?.dateTime;
    const dateStr = dateIso ? new Date(dateIso).toISOString().slice(0, 10) : "";
    const timeStr = dateIso ? new Date(dateIso).toISOString().slice(11, 16) : "";
    const tariff = inferTariffFromDateTime(dateStr, timeStr);

    const waitHours = watchWait ?? 0;
    const waitMinutes = Math.max(0, waitHours * 60);
    const baggageCount = watchLuggage ?? 0;
    const fifthPassenger = (watchPax ?? 1) > 4;

    const configEuros = {
      baseCharge: tariffConfig.baseChargeCents / 100,
      km: {
        A: tariffConfig.kmCentsA / 100,
        B: tariffConfig.kmCentsB / 100,
        C: tariffConfig.kmCentsC / 100,
        D: tariffConfig.kmCentsD / 100,
      } as Record<string, number>,
      waitPerHour: tariffConfig.waitPerHourCents / 100,
      baggageFee: tariffConfig.baggageFeeCents / 100,
      fifthFee: tariffConfig.fifthPassengerCents / 100,
    };

    const extrasCost =
      (waitMinutes / 60) * configEuros.waitPerHour +
      baggageCount * configEuros.baggageFee +
      (fifthPassenger ? configEuros.fifthFee : 0);

    const kmRate = configEuros.km[tariff] ?? configEuros.km.A;
    if (!kmRate || kmRate <= 0) return;

    const distance = (amount - configEuros.baseCharge - extrasCost) / kmRate;
    if (Number.isFinite(distance) && distance >= 0) {
      lastChangeRef.current = "amount";
      form.setValue("realKm", Math.round(distance * 10) / 10, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.trigger("adjustmentComment");
    }
  }, [
    bookingSummary?.dateTime,
    form,
    lastChangeRef,
    tariffConfig,
    watchAmount,
    watchLuggage,
    watchPax,
    watchWait,
  ]);

  // Forcer le commentaire si le montant diffère du montant initial
  const watchComment = form.watch("adjustmentComment");
  useEffect(() => {
    const baseline = initialAmountRef.current;
    const amount = Number(form.getValues("amountEuros"));
    const requiresComment = !Number.isNaN(amount) && amount !== baseline;
    const hasComment = Boolean(watchComment?.trim());

    if (requiresComment && !hasComment) {
      form.setError("adjustmentComment", {
        type: "manual",
        message: "Commentaire requis lorsque le montant diffère du montant initial.",
      });
    } else {
      form.clearErrors("adjustmentComment");
    }
  }, [form, watchAmount, watchComment]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setMessage(null);
    try {
      const payload = {
        amountEuros: values.amountEuros,
        issuedAt: new Date(values.issuedAt).toISOString(),
        pdfPath: values.pdfPath?.trim() || undefined,
        bookingId: values.bookingId,
        estimatedKm: bookingSummary?.estimatedKm,
        realKm: values.realKm ?? bookingSummary?.estimatedKm,
        estimatedLuggage: bookingSummary?.estimatedLuggage,
        realLuggage: values.realLuggage ?? bookingSummary?.estimatedLuggage,
        estimatedPax: bookingSummary?.estimatedPax,
        realPax: values.realPax ?? bookingSummary?.estimatedPax,
        sendToClient: values.sendToClient ?? false,
        waitHours: values.waitHours ?? 0,
        paid: values.paid ?? true,
        paymentMethod: values.paymentMethod ?? undefined,
      };
      const res = await fetch(
        mode === "edit" && invoiceId ? `/api/admin/invoices/${invoiceId}` : "/api/admin/invoices",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Mise à jour impossible");
      }
      setMessage({
        type: "success",
        text: mode === "edit" ? "Facture mise à jour." : "Facture créée.",
      });
      router.refresh();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur inconnue" });
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-5"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/30 px-3 py-2">
          <Label htmlFor="realKm" className="flex items-center gap-2 font-semibold text-foreground">
            <span>Kilométrage (km)</span>
            {bookingSummary?.estimatedKm != null ? (
              <span className="text-[13px] font-medium text-muted-foreground">
                <span className="font-semibold text-primary">{bookingSummary.estimatedKm}</span>
              </span>
            ) : null}
          </Label>
          <Input
            id="realKm"
            type="number"
            step="0.1"
            className="cursor-pointer w-[8ch]"
            {...form.register("realKm", { valueAsNumber: true })}
            defaultValue={bookingSummary?.estimatedKm ?? ""}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-card px-3 py-2">
          <Label
            htmlFor="realLuggage"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <span>Bagages</span>
            {bookingSummary?.estimatedLuggage != null ? (
              <span className="text-[13px] font-medium text-muted-foreground">
                <span className="font-semibold text-primary">
                  {bookingSummary.estimatedLuggage}
                </span>
              </span>
            ) : null}
          </Label>
          <div className="flex items-center gap-2 md:max-w-[200px]">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                const current = form.getValues("realLuggage") ?? 0;
                form.setValue("realLuggage", Math.max(0, current - 1), { shouldValidate: true });
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="realLuggage"
              type="number"
              className="w-[7ch] text-center"
              value={form.watch("realLuggage") ?? 0}
              onChange={(e) =>
                form.setValue("realLuggage", Number(e.target.value), { shouldValidate: true })
              }
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                const current = form.getValues("realLuggage") ?? 0;
                form.setValue("realLuggage", current + 1, { shouldValidate: true });
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/30 px-3 py-2">
          <Label
            htmlFor="realPax"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <span>Passagers</span>
            {bookingSummary?.estimatedPax != null ? (
              <span className="text-[13px] font-medium text-muted-foreground">
                <span className="font-semibold text-primary">{bookingSummary.estimatedPax}</span>
              </span>
            ) : null}
          </Label>
          <div className="flex items-center gap-2 md:max-w-[200px]">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                const current = form.getValues("realPax") ?? 1;
                form.setValue("realPax", Math.max(1, current - 1), { shouldValidate: true });
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="realPax"
              type="number"
              className="w-[7ch] text-center"
              value={form.watch("realPax") ?? 1}
              onChange={(e) =>
                form.setValue("realPax", Number(e.target.value), { shouldValidate: true })
              }
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                const current = form.getValues("realPax") ?? 1;
                form.setValue("realPax", current + 1, { shouldValidate: true });
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-card px-3 py-2">
          <Label
            htmlFor="waitHours"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <span>Attente (heures)</span>
          </Label>
          <div className="flex items-center gap-2 md:max-w-[200px]">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                const current = form.getValues("waitHours") ?? 0;
                form.setValue("waitHours", Math.max(0, current - 1), { shouldValidate: true });
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="waitHours"
              type="number"
              className="w-[7ch] text-center"
              value={form.watch("waitHours") ?? 0}
              onChange={(e) =>
                form.setValue("waitHours", Number(e.target.value), { shouldValidate: true })
              }
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                const current = form.getValues("waitHours") ?? 0;
                form.setValue("waitHours", current + 1, { shouldValidate: true });
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/30 px-3 py-2">
        <Label htmlFor="amountEuros" className="flex items-center gap-2 md:min-w-[220px]">
          <span>Montant (€)</span>
          {bookingSummary?.estimatedAmount != null ? (
            <span className="text-[13px] font-medium text-muted-foreground">
              <span className="font-semibold text-primary">
                {bookingSummary.estimatedAmount.toFixed(2)} €
              </span>
            </span>
          ) : null}
        </Label>
        <div className="md:max-w-[220px] w-full flex justify-end">
          <Input
            id="amountEuros"
            type="number"
            step="0.01"
            inputMode="decimal"
            className="cursor-pointer w-[10ch]"
            {...form.register("amountEuros")}
          />
        </div>
      </div>
      {form.formState.errors.amountEuros ? (
        <p className="text-xs text-destructive">{form.formState.errors.amountEuros.message}</p>
      ) : null}

      <div className="flex items-center justify-between gap-4 rounded-xl bg-card px-3 py-2">
        <label className="flex items-center gap-2 font-semibold text-foreground" htmlFor="paid">
          <Checkbox
            id="paid"
            checked={form.watch("paid") ?? true}
            onCheckedChange={(v) =>
              form.setValue("paid", Boolean(v), { shouldValidate: true, shouldDirty: true })
            }
          />
          Payée ?
        </label>
        <div className="flex items-center gap-2">
          <Select
            value={form.watch("paymentMethod") ?? undefined}
            onValueChange={(v: "CB" | "CASH" | "PAYPAL" | "BTC") =>
              form.setValue("paymentMethod", v, { shouldValidate: true, shouldDirty: true })
            }
            disabled={form.watch("paid") === false}
          >
            <SelectTrigger className="w-[160px] cursor-pointer">
              <SelectValue placeholder="Moyen de paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CB">CB</SelectItem>
              <SelectItem value="CASH">CASH</SelectItem>
              <SelectItem value="PAYPAL">PayPal</SelectItem>
              <SelectItem value="BTC">BTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-start">
        <Checkbox
          id="sendToClient"
          checked={form.watch("sendToClient") ?? false}
          onCheckedChange={(v) =>
            form.setValue("sendToClient", Boolean(v), { shouldValidate: true })
          }
        />
        <Label htmlFor="sendToClient" className="cursor-pointer">
          Envoyer la facture au client
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="adjustmentComment">
          Commentaire (requis si le montant diffère du montant initial)
        </Label>
        <Textarea
          id="adjustmentComment"
          placeholder="Expliquez la raison de l'écart..."
          className="min-h-[80px]"
          {...form.register("adjustmentComment")}
        />
        {Number(form.watch("amountEuros")) !==
          (bookingSummary?.estimatedAmount ?? defaultValues.amountEuros) &&
        !form.watch("adjustmentComment") ? (
          <p className="text-xs text-destructive">
            Commentaire requis lorsque le montant diffère du montant initial.
          </p>
        ) : null}
      </div>

      {/* Conserver la valeur PDF sans l'exposer dans l'UI */}
      <input type="hidden" {...form.register("pdfPath")} />

      {message ? (
        <div
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
          className="cursor-pointer"
        >
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {mode === "edit" ? "Enregistrer" : "Créer"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="cursor-pointer"
          onClick={() => {
            form.reset();
            setMessage(null);
          }}
        >
          Réinitialiser
        </Button>
        {bookingSummary ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setShowSummary((prev) => !prev)}
            aria-expanded={showSummary}
          >
            {showSummary ? "Masquer" : "Voir"} la réservation
          </Button>
        ) : null}
      </div>

      {bookingSummary && showSummary ? (
        <div
          className="rounded-xl border border-border/70 bg-accent/30 px-4 py-3 text-sm"
          aria-label="Résumé de la réservation"
        >
          <p className="font-semibold text-foreground">Résumé de la réservation</p>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">ID :</span> {bookingSummary.id}
            </p>
            {bookingSummary.dateTime ? (
              <p>
                <span className="font-medium text-foreground">Date/heure :</span>{" "}
                {new Date(bookingSummary.dateTime).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
            <p>
              <span className="font-medium text-foreground">Client :</span> {bookingSummary.client}
            </p>
            <p>
              <span className="font-medium text-foreground">Départ :</span>{" "}
              {bookingSummary.pickup || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Arrivée :</span>{" "}
              {bookingSummary.dropoff || "—"}
            </p>
          </div>
        </div>
      ) : null}
    </form>
  );
}
