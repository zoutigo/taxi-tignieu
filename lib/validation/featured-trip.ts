import { z } from "zod";

export const featuredTripSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(3),
  title: z.string().trim().min(3),
  summary: z.string().trim().optional(),
  featuredSlot: z.enum(["TYPE", "ZONE"]).nullable().optional(),
  pickupLabel: z.string().trim().min(3),
  dropoffLabel: z.string().trim().min(3),
  pickupAddressId: z.string().uuid().nullable().optional(),
  dropoffAddressId: z.string().uuid().nullable().optional(),
  distanceKm: z.number().nonnegative().optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  basePriceCents: z.number().int().nonnegative().optional(),
  priority: z.number().int().min(0).max(10000).default(100),
  active: z.boolean().default(true),
  heroImageUrl: z.undefined(),
  badge: z.string().trim().optional(),
  zoneLabel: z.string().trim().optional(),
});

export type FeaturedTripInput = z.infer<typeof featuredTripSchema>;
