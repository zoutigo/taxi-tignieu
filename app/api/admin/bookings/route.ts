import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { buildBookingEmail, sendMail } from "@/lib/mailer";
import { getSiteContact } from "@/lib/site-config";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

const updateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  pickup: z.string().optional(),
  dropoff: z.string().optional(),
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

export async function GET() {
  const session = await auth();
  const isDriver = Boolean((session as { user?: { isDriver?: boolean } } | null)?.user?.isDriver);
  if (!isAdminLike(session) && !isDriver) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
      bookingNotes: { orderBy: { createdAt: "asc" } },
    } as unknown as NonNullable<Parameters<typeof prisma.booking.findMany>[0]>["include"],
  });

  return NextResponse.json({ bookings }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const user = (
    session as {
      user?: { id?: string; isDriver?: boolean; isAdmin?: boolean; isManager?: boolean };
    } | null
  )?.user;
  const adminLike = isAdminLike(session);
  const isDriver = Boolean(user?.isDriver);
  if (!adminLike && !isDriver) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const {
    id,
    pickup,
    dropoff,
    date,
    time,
    passengers,
    luggage,
    babySeat,
    notes,
    completionNotes,
    status,
    priceCents,
    driverId,
  } = parsed.data;
  const bookingId = String(id);

  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
      pickup: true,
      dropoff: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  if (!adminLike) {
    const providedKeys = Object.keys(parsed.data).filter((k) => k !== "id");
    const allowedForDriver = ["status", "driverId"];
    if (providedKeys.some((k) => !allowedForDriver.includes(k))) {
      return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
    }
    if (driverId !== undefined) {
      const isRelease = driverId === null;
      const isClaim = driverId === user?.id;
      const isTransfer = !isRelease && !isClaim;

      if (isRelease && existing.driverId && existing.driverId !== user?.id) {
        return NextResponse.json(
          { error: "Réservation déjà assignée à un autre chauffeur." },
          { status: 409 }
        );
      }
      if ((isClaim || isTransfer) && existing.driverId && existing.driverId !== user?.id) {
        return NextResponse.json({ error: "Réservation déjà prise." }, { status: 409 });
      }

      if ((isClaim || isTransfer) && driverId) {
        const target = await prisma.user.findUnique({
          where: { id: driverId },
          select: { isDriver: true },
        });
        if (!target?.isDriver) {
          return NextResponse.json({ error: "Le chauffeur cible est invalide." }, { status: 400 });
        }
      }
    }
  }

  const data: Record<string, unknown> = {};
  if (pickup !== undefined) data.pickup = pickup;
  if (dropoff !== undefined) data.dropoff = dropoff;
  if (date && time) data.dateTime = new Date(`${date}T${time}`);
  if (passengers !== undefined) data.pax = passengers;
  if (luggage !== undefined) data.luggage = luggage;
  if (babySeat !== undefined) data.babySeat = babySeat;
  if (completionNotes !== undefined && status === "COMPLETED") {
    // notes field removed; handled via bookingNote creation below
  }
  if (status !== undefined) data.status = status;
  if (priceCents !== undefined) data.priceCents = priceCents;
  if (driverId !== undefined) data.driverId = driverId;

  const updateWithNotes = async (tx: typeof prisma) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        customer: { select: { fullName: true, phone: true, email: true } },
        driver: { select: { id: true, name: true, email: true, phone: true } },
        pickup: true,
        dropoff: true,
        bookingNotes: { orderBy: { createdAt: "asc" } },
      },
    });

    const notesToAdd = completionNotes ?? notes;
    if (notesToAdd && notesToAdd.trim().length > 0 && tx.bookingNote?.create) {
      await tx.bookingNote.create({
        data: {
          content: notesToAdd.trim(),
          bookingId: updated.id,
          authorId: user?.id ?? null,
        },
      });
    }

    return tx.booking.findUnique({
      where: { id: updated.id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        customer: { select: { fullName: true, phone: true, email: true } },
        driver: { select: { id: true, name: true, email: true, phone: true } },
        pickup: true,
        dropoff: true,
        bookingNotes: { orderBy: { createdAt: "asc" } },
      },
    });
  };

  const booking =
    typeof prisma.$transaction === "function"
      ? await prisma.$transaction((tx) => updateWithNotes(tx as typeof prisma))
      : await updateWithNotes(prisma);

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const formatAddress = (addr?: {
    name?: string | null;
    street?: string | null;
    streetNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  }) => {
    if (!addr) return "—";
    if (addr.name) return addr.name;
    const parts = [addr.streetNumber, addr.street, addr.postalCode, addr.city, addr.country]
      .filter(Boolean)
      .map((p) => String(p).trim())
      .filter(Boolean);
    return parts.join(" ") || "—";
  };

  const sendEmailsIfNeeded = async () => {
    const hasEmail = (email?: string | null) => Boolean(email && email.trim().length > 0);
    const statusChangedToConfirmed =
      parsed.data.status === "CONFIRMED" && existing.status !== "CONFIRMED";
    if (!statusChangedToConfirmed) return;

    const site = await getSiteContact();
    const when = booking.dateTime.toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const bookingRef = `CMD-${booking.id}`;
    const pickupAddress = formatAddress(booking.pickup);
    const dropoffAddress = formatAddress(booking.dropoff);
    const passengers = `${booking.pax}`;
    const luggageTxt = `${booking.luggage ?? 0}`;
    const manageUrl =
      process.env.NEXTAUTH_URL || process.env.AUTH_URL
        ? `${process.env.NEXTAUTH_URL || process.env.AUTH_URL}/espace-client/bookings/${booking.id}`
        : "/espace-client";
    const siteUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "";
    const privacyUrl = `${siteUrl}/politique-de-confidentialite`;
    const legalUrl = `${siteUrl}/mentions-legales`;

    const clientEmail = booking.user?.email ?? booking.customer?.email ?? null;
    const clientName =
      booking.user?.name ?? booking.customer?.fullName ?? booking.user?.email ?? "Client";
    const clientPhone = booking.user?.phone ?? booking.customer?.phone ?? "";

    const driverEmail = booking.driver?.email ?? null;
    const driverName = booking.driver?.name ?? booking.driver?.email ?? "";
    const driverPhone = booking.driver?.phone ?? "";

    // Driver notification (if different from current user)
    if (hasEmail(driverEmail) && driverId && driverId !== user?.id) {
      const mailToDriver = buildBookingEmail({
        to: driverEmail as string,
        status: "pending",
        badgeLabel: "Course assignée",
        statusLabel: "Vous avez reçu une nouvelle course",
        title: "Nouvelle course à prendre en charge",
        intro:
          "Une course vous a été assignée. Retrouvez les détails et les coordonnées du client ci-dessous.",
        bookingRef,
        pickupDateTime: when,
        pickupAddress,
        dropoffAddress,
        passengers,
        luggage: luggageTxt,
        paymentMethod: booking.priceCents
          ? `${(booking.priceCents / 100).toFixed(2)} €`
          : "À confirmer",
        manageUrl: `${siteUrl}/dashboard/bookings`,
        contactName: clientName,
        contactEmail: clientEmail ?? "",
        contactPhone: clientPhone ?? "",
        phone: site.phone,
        email: site.email,
        brandCity: site.address.city ?? "Tignieu-Jameyzieu",
        preheader: "Nouvelle course assignée",
        siteUrl,
        privacyUrl,
        legalUrl,
      });
      sendMail(mailToDriver).catch((err) =>
        console.error("Erreur mail assignation chauffeur", err)
      );
    }

    // User confirmation email (always send if we have an email)
    if (hasEmail(clientEmail)) {
      const mailToUser = buildBookingEmail({
        to: clientEmail as string,
        status: "confirmed",
        badgeLabel: "Réservation confirmée",
        statusLabel: driverName ? `Votre chauffeur : ${driverName}` : "Course confirmée",
        title: "Votre réservation est confirmée",
        intro: driverName
          ? `Votre trajet est confirmé. ${driverName} sera votre chauffeur.`
          : "Votre trajet est confirmé.",
        bookingRef,
        pickupDateTime: when,
        pickupAddress,
        dropoffAddress,
        passengers,
        luggage: luggageTxt,
        paymentMethod: booking.priceCents
          ? `${(booking.priceCents / 100).toFixed(2)} € (estimé)`
          : "À confirmer",
        manageUrl,
        contactName: driverName,
        contactEmail: booking.driver?.email ?? "",
        contactPhone: driverPhone,
        phone: site.phone,
        email: site.email,
        brandCity: site.address.city ?? "Tignieu-Jameyzieu",
        preheader: "Votre réservation Taxi Tignieu est confirmée",
        siteUrl,
        privacyUrl,
        legalUrl,
      });
      sendMail(mailToUser).catch((err) => console.error("Erreur mail confirmation client", err));
    }
  };

  sendEmailsIfNeeded().catch((err) => console.error("Erreur envoi mails admin bookings", err));

  return NextResponse.json({ booking }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" || typeof body?.id === "number" ? String(body.id) : null;
  if (!id) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  await prisma.booking.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
