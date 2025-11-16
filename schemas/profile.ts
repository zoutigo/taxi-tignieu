import { z } from "zod";

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(8, "Indiquez un numéro valide.")
    .max(20, "Le numéro est trop long.")
    .regex(/^[+0-9 ().-]{8,20}$/, "Format du numéro invalide."),
});

export type PhoneFormInput = z.infer<typeof phoneSchema>;
