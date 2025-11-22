"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const { status: sessionStatus } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [hasPosted, setHasPosted] = useState(false);

  const isPostingRef = useRef(false);

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

  const onSubmit = form.handleSubmit(async (data: BookingEstimateInput) => {
    setBookingEstimate(data, storedPrice ?? 0);

    if (sessionStatus === "authenticated") {
      await createBooking(data);
      return;
    }

    // Invite to login; booking will be posted on return thanks to persisted store
    await signIn("google", { callbackUrl: "/reserver" });
  });

  useEffect(() => {
    if (sessionStatus === "authenticated" && storedEstimate && !hasPosted) {
      void createBooking(storedEstimate);
    }
  }, [sessionStatus, storedEstimate, hasPosted, createBooking]);

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
          <form className="card space-y-4" onSubmit={onSubmit}>
            <div className="flex items-center gap-3">
              <span className="badge-pill bg-muted text-muted-foreground">Étape 2</span>
              <p className="text-sm font-medium text-muted-foreground">Confirmation</p>
            </div>

            <FormField
              control={form.control}
              name="pickup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de prise en charge</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="24 rue de la Gare, Tignieu"
                      className="border-border/60 bg-white/90 text-base text-foreground placeholder:text-muted-foreground dark:bg-card/70"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dropoff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Aéroport Saint-Exupéry"
                      className="border-border/60 bg-white/90 text-base text-foreground placeholder:text-muted-foreground dark:bg-card/70"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                          {[0, 1, 2, 3, 4].map((count) => (
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
