import { z } from "zod";

export const bookingUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  pickup: z.string().optional(),
  dropoff: z.string().optional(),
  pickupLabel: z.string().optional(), // alias front
  dropoffLabel: z.string().optional(), // alias front
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  distanceKm: z.number().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  passengers: z.number().optional(),
  luggage: z.number().optional(),
  babySeat: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  priceCents: z.number().int().optional(),
  driverId: z.union([z.string(), z.null()]).optional(),
  completionNotes: z.string().optional(),
  generateInvoice: z.boolean().optional(),
});

export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
