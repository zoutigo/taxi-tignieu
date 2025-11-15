import { z } from "zod";

export const bookingEstimateSchema = z.object({
  pickup: z.string().min(3, "Indiquez un lieu de prise en charge."),
  dropoff: z.string().min(3, "Indiquez une destination."),
  date: z.string().min(1, "Sélectionnez une date."),
  time: z
    .string()
    .min(1, "Sélectionnez une heure.")
    .regex(/^\d{2}:\d{2}$/, "Format HH:MM requis."),
  passengers: z.number().int().min(1, "1 passager minimum.").max(7, "7 passagers maximum."),
  luggage: z.number().int().min(0).max(6),
  notes: z.string().max(280).optional().or(z.literal("")),
});

export type BookingEstimateInput = z.infer<typeof bookingEstimateSchema>;
