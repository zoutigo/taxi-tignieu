"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingEstimateSchema } from "@/schemas/booking";
import { setBookingEstimate, useBookingStore } from "@/hooks/useBookingStore";
import type { BookingEstimateInput } from "@/schemas/booking";
import { ArrowRight, Navigation, Plane } from "lucide-react";
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

const courseTypes = [
  {
    label: "Aéroport Saint-Exupéry",
    price: "35 €",
    description: "Prise en charge Tignieu → Aéroport",
  },
  { label: "Lyon centre", price: "45 €", description: "Trajet vers Presqu'île / Part-Dieu" },
  {
    label: "Longue distance",
    price: "1,80 €/km",
    description: "Au-delà de 50 km, sur devis personnalisé",
  },
  {
    label: "VSL / CPAM",
    price: "Selon prise en charge",
    description: "Transport assis professionnalisé",
  },
];

export function TarifsPage() {
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

  const form = useForm<BookingEstimateInput>({
    resolver: zodResolver(bookingEstimateSchema),
    mode: "onChange",
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const [quote, setQuote] = useState<{ data: BookingEstimateInput; price: number } | null>(
    storedEstimate && storedPrice ? { data: storedEstimate, price: storedPrice } : null
  );

  const computePrice = (data: BookingEstimateInput) => {
    let price = 35;
    if (data.pickup.toLowerCase().includes("lyon") || data.dropoff.toLowerCase().includes("lyon")) {
      price += 8;
    }
    if (data.passengers > 4) {
      price += 12;
    }
    if (data.luggage > 2) {
      price += 5;
    }
    const hour = Number(data.time.split(":")[0]);
    if (hour >= 20 || hour < 6) {
      price = Math.round(price * 1.15);
    }
    return price;
  };

  const handleEstimate = form.handleSubmit((data: BookingEstimateInput) => {
    const price = computePrice(data);
    setQuote({ data, price });
    setBookingEstimate(data, price);
  });

  const benefits = useMemo(
    () => [
      "Attente gratuite 15 minutes",
      "Suivi de vol et ajustement en cas de retard",
      "Eau fraîche et chargeurs à bord",
    ],
    []
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
      <section className="space-y-6">
        <div className="rounded-[32px] border border-border/80 bg-card p-8 shadow-[0_45px_85px_rgba(5,15,35,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="badge-pill bg-muted text-muted-foreground">Tarifs</span>
              <h1 className="mt-4 font-display text-4xl text-foreground">
                Des tarifs transparents
              </h1>
              <p className="text-base text-muted-foreground">
                Estimez votre course en ligne et découvrez nos forfaits les plus demandés.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" /> Aéroports, gares, longues distances
              </p>
              <p className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" /> Suivi kilométrique transparent
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {courseTypes.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-5 text-center shadow-[0_20px_30px_rgba(5,15,35,0.08)]"
              >
                <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Forfait</p>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{item.label}</h3>
                <p className="text-3xl font-bold text-primary">{item.price}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="estimate" className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <Form {...form}>
          <form className="card space-y-4" onSubmit={handleEstimate}>
            <div className="flex items-center gap-3">
              <span className="badge-pill bg-muted text-muted-foreground">Estimation</span>
              <p className="text-sm font-medium text-muted-foreground">Vos informations</p>
            </div>

            <FormField
              control={form.control}
              name="pickup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de prise en charge</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
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
                      type="text"
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

            <Button type="submit" className="btn btn-primary w-full">
              Calculer mon estimation
            </Button>
          </form>
        </Form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-border/80 bg-card px-6 py-8 shadow-[0_35px_55px_rgba(5,15,35,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Résultat
            </p>
            {quote ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">Votre estimation</p>
                <p className="text-4xl font-semibold text-primary">{quote.price} €</p>
                <p className="text-sm text-muted-foreground">
                  Tarif indicatif selon les informations transmises. Un chauffeur confirmera le prix
                  exact.
                </p>
                <Link
                  href="/reserver"
                  className="btn btn-primary justify-center"
                  onClick={() => setBookingEstimate(quote.data, quote.price)}
                >
                  Réserver ce trajet
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Remplissez le formulaire pour obtenir une estimation personnalisée.
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-border/70 bg-card px-5 py-5 text-sm text-muted-foreground shadow-[0_20px_30px_rgba(5,15,35,0.08)]">
            <p className="font-semibold text-foreground">Inclus dans chaque trajet</p>
            <ul className="mt-3 space-y-2">
              {benefits.map((benefit) => (
                <li key={benefit}>• {benefit}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
