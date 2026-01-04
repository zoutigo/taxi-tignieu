import { z } from "zod";

const addressSchema = z.object({
  label: z.string().trim().min(3, "Adresse requise"),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  postcode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  name: z.string().optional(),
});

export const bookingEstimateSchema = z
  .object({
    pickup: addressSchema,
    dropoff: addressSchema,
    date: z.string().min(1, "Sélectionnez une date."),
    time: z
      .string()
      .min(1, "Sélectionnez une heure.")
      .regex(/^\d{2}:\d{2}$/, "Format HH:MM requis."),
    passengers: z.number().int().min(1, "1 passager minimum.").max(7, "7 passagers maximum."),
    luggage: z.number().int().min(0).max(6),
    notes: z.string().max(280).optional().or(z.literal("")),
    policiesAccepted: z.boolean().refine((val) => val === true, {
      message:
        "Veuillez confirmer avoir lu la politique de confidentialité et les mentions légales.",
    }),
  })
  .superRefine((value, ctx) => {
    (["pickup", "dropoff"] as const).forEach((key) => {
      const addr = value[key];
      if (!addr.label || addr.label.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Adresse requise",
          path: [key, "label"],
        });
        return;
      }
      if (!Number.isFinite(addr.lat ?? NaN) || !Number.isFinite(addr.lng ?? NaN)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Coordonnées manquantes",
          path: [key],
        });
      }
    });
  });

export type BookingEstimateInput = z.infer<typeof bookingEstimateSchema>;
