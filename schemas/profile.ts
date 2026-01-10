import { z } from "zod";

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(8, "Indiquez un numéro valide.")
    .max(20, "Le numéro est trop long.")
    .regex(/^[+0-9 ().-]{8,20}$/, "Format du numéro invalide."),
});

export type PhoneFormInput = z.infer<typeof phoneSchema>;

const coordinateSchema = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const parsed = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed : null;
  });

export const userAddressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Ajoutez un nom pour l'adresse (ex. « Boulot »)")
    .max(50, "Nom d'adresse trop long."),
  name: z
    .string()
    .trim()
    .max(80, "Complément d'adresse trop long.")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || null),
  streetNumber: z
    .string()
    .trim()
    .max(10, "Numéro trop long.")
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || null),
  street: z
    .string()
    .trim()
    .min(3, "Rue requise.")
    .max(120, "Rue trop longue.")
    .transform((value) => value.trim()),
  postalCode: z
    .string()
    .trim()
    .min(4, "Code postal requis.")
    .max(12, "Code postal trop long.")
    .transform((value) => value.trim()),
  city: z
    .string()
    .trim()
    .min(2, "Ville requise.")
    .max(80, "Ville trop longue.")
    .transform((value) => value.trim()),
  country: z
    .string()
    .trim()
    .min(2, "Pays requis.")
    .max(56, "Pays trop long.")
    .transform((value) => value.trim()),
  latitude: coordinateSchema,
  longitude: coordinateSchema,
});

export type UserAddressInput = z.infer<typeof userAddressSchema>;
