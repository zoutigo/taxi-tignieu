import { z } from "zod";

const uuidOrCuid = z.string().uuid().or(z.string().cuid());

export const featuredTripSchema = z.object({
  id: uuidOrCuid.optional(),
  slug: z.string().trim().min(3),
  title: z.string().trim().min(3),
  summary: z.string().trim().optional(),
  featuredSlot: z.enum(["TYPE", "ZONE"]).nullable().optional(),
  pickupLabel: z.string().trim().min(3),
  dropoffLabel: z.string().trim().min(3).optional(),
  pickupAddressId: uuidOrCuid.refine((v) => Boolean(v), {
    message: "Une adresse de départ valide est requise",
  }),
  dropoffAddressId: uuidOrCuid.optional(), // conservé pour compatibilité mais POI font foi
  distanceKm: z.number().nonnegative().optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  basePriceCents: z.number().int().nonnegative().optional(),
  priority: z.number().int().min(0).max(10000).default(100),
  active: z.boolean().default(true),
  heroImageUrl: z.string().url().nullable().optional(),
  badge: z.string().trim().optional(),
  zoneLabel: z.string().trim().optional(),
  poiDestinations: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(3),
        dropoffAddressId: uuidOrCuid.refine((v) => Boolean(v), {
          message: "Chaque destination doit avoir une adresse géocodée",
        }),
        distanceKm: z.number().nonnegative().optional(),
        durationMinutes: z.number().int().nonnegative().optional(),
        priceCents: z.number().int().nonnegative().optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .min(1)
    .optional(),
});

export type FeaturedTripInput = z.infer<typeof featuredTripSchema>;
