import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bookingEstimateSchema } from "@/schemas/booking";
import { z } from "zod";
import { buildBookingEmail, sendMail } from "@/lib/mailer";
import { getSiteContact } from "@/lib/site-config";

const patchSchema = bookingEstimateSchema
  .partial()
  .extend({
    id: z.union([z.string(), z.number()]),
    estimatedPrice: z.number().optional(),
  })
  .required({ id: true });

const createAddressData = (addr: z.infer<typeof bookingEstimateSchema>["pickup"]) => ({
  name: addr.name ?? null,
  street: addr.street ?? null,
  streetNumber: addr.streetNumber ?? null,
  postalCode: addr.postcode ?? null,
  city: addr.city ?? null,
  country: addr.country ?? null,
  latitude: addr.lat,
  longitude: addr.lng,
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bookingEstimateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { pickup, dropoff, date, time, passengers, luggage, notes } = parsed.data;
  const dateTime = new Date(`${date}T${time}`);
  const priceCents =
    typeof body.estimatedPrice === "number" && Number.isFinite(body.estimatedPrice)
      ? Math.round(body.estimatedPrice * 100)
      : null;

  try {
    const pickupAddress = await prisma.address.create({ data: createAddressData(pickup) });
    const dropoffAddress = await prisma.address.create({ data: createAddressData(dropoff) });

    const createBookingWithNotes = async (tx: typeof prisma) => {
      const created = await tx.booking.create({
        data: {
          pickupId: pickupAddress.id,
          dropoffId: dropoffAddress.id,
          dateTime,
          pax: passengers,
          luggage,
          priceCents,
          userId,
        },
      });

      if (notes && notes.trim().length > 0 && tx.bookingNote?.create) {
        await tx.bookingNote.create({
          data: {
            content: notes.trim(),
            bookingId: created.id,
            authorId: userId,
          },
        });
      }
      return created;
    };

    const booking =
      typeof prisma.$transaction === "function"
        ? await prisma.$transaction((tx) => createBookingWithNotes(tx as typeof prisma))
        : await createBookingWithNotes(prisma);

    const userEmail = session.user?.email ?? null;
    if (userEmail) {
      const when = dateTime.toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      });
      const priceText =
        priceCents !== null ? `${(priceCents / 100).toFixed(2)} € (estimé)` : "À confirmer";
      const site = await getSiteContact();
      const manageUrl =
        process.env.NEXTAUTH_URL || process.env.AUTH_URL
          ? `${process.env.NEXTAUTH_URL || process.env.AUTH_URL}/espace-client`
          : "/espace-client";

      const userInfo = (session.user as { name?: string; email?: string; phone?: string }) || {};
      const email = buildBookingEmail({
        status: "pending",
        to: userEmail,
        badgeLabel: "Réservation reçue",
        title: "Votre demande est enregistrée",
        intro:
          "Nous vérifions la disponibilité et vous recontactons rapidement. Retrouvez le détail de votre trajet ci-dessous.",
        blockTitle: "Détails de votre trajet",
        bookingRef: `CMD-${booking.id}`,
        pickupDateTime: when,
        pickupAddress:
          `${pickup.name ?? ""} ${pickup.street ?? ""} ${pickup.postcode ?? ""} ${pickup.city ?? ""}`.trim(),
        dropoffAddress:
          `${dropoff.name ?? ""} ${dropoff.street ?? ""} ${dropoff.postcode ?? ""} ${dropoff.city ?? ""}`.trim(),
        passengers: `${passengers}`,
        luggage: `${luggage ?? 0}`,
        paymentMethod: priceText,
        manageUrl,
        contactName: userInfo.name ?? "",
        contactEmail: userInfo.email ?? "",
        contactPhone: userInfo.phone ?? "",
        phone: site.phone,
        email: site.email,
        brandCity: site.address.city ?? "Tignieu-Jameyzieu",
        preheader: "Votre réservation Taxi Tignieu est enregistrée.",
        siteUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "",
        privacyUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/politique-de-confidentialite`,
        legalUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/mentions-legales`,
      });

      sendMail(email).catch((err) => {
        console.error("Erreur envoi email réservation", err);
      });
    }

    const bookingFull = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { pickup: true, dropoff: true, bookingNotes: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ booking: bookingFull }, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { pickup: true, dropoff: true, bookingNotes: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ bookings }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const sessionUser = session.user as {
    id?: string;
    email?: string;
    name?: string;
    phone?: string;
    isAdmin?: boolean;
  };

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { id, pickup, dropoff, date, time, passengers, luggage, notes, estimatedPrice } =
    parsed.data;
  const bookingId = String(id);

  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      pickup: true,
      dropoff: true,
      bookingNotes: { orderBy: { createdAt: "asc" } },
      invoice: true,
    },
  });
  const isOwner = existing?.userId === userId;
  const adminList =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const isAdmin =
    Boolean(sessionUser.isAdmin) ||
    (sessionUser.email && adminList.includes(sessionUser.email.toLowerCase()));

  if (!existing || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED" || existing.invoice) {
    return NextResponse.json(
      { error: "Impossible de modifier une réservation terminée, annulée ou facturée." },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = {};
  if (pickup) {
    const pickupAddress = await prisma.address.create({ data: createAddressData(pickup) });
    data.pickupId = pickupAddress.id;
  }
  if (dropoff) {
    const dropoffAddress = await prisma.address.create({ data: createAddressData(dropoff) });
    data.dropoffId = dropoffAddress.id;
  }
  if (date && time) data.dateTime = new Date(`${date}T${time}`);
  if (typeof passengers === "number") data.pax = passengers;
  if (typeof luggage === "number") data.luggage = luggage;
  if (notes !== undefined && notes && notes.trim().length > 0 && prisma.bookingNote?.create) {
    await prisma.bookingNote.create({
      data: {
        content: notes.trim(),
        bookingId: bookingId,
        authorId: userId,
      },
    });
  }
  if (typeof estimatedPrice === "number" && Number.isFinite(estimatedPrice)) {
    data.priceCents = Math.round(estimatedPrice * 100);
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data,
    include: { pickup: true, dropoff: true, bookingNotes: { orderBy: { createdAt: "asc" } } },
  });

  try {
    const site = await getSiteContact();
    const userEmail = sessionUser.email;
    const siteEmail = site.email;
    const formatAddress = (addr?: {
      name?: string | null;
      street?: string | null;
      postalCode?: string | null;
      city?: string | null;
    }) =>
      `${addr?.name ?? ""} ${addr?.street ?? ""} ${addr?.postalCode ?? ""} ${addr?.city ?? ""}`.trim();
    const changes: string[] = [];
    if (
      existing?.dateTime &&
      booking.dateTime &&
      existing.dateTime.getTime() !== booking.dateTime.getTime()
    ) {
      changes.push(
        `Date & heure : ${existing.dateTime.toLocaleString("fr-FR")} → ${booking.dateTime.toLocaleString("fr-FR")}`
      );
    }
    if (formatAddress(existing?.pickup) !== formatAddress(booking.pickup)) {
      changes.push(
        `Départ : ${formatAddress(existing?.pickup)} → ${formatAddress(booking.pickup)}`
      );
    }
    if (formatAddress(existing?.dropoff) !== formatAddress(booking.dropoff)) {
      changes.push(
        `Arrivée : ${formatAddress(existing?.dropoff)} → ${formatAddress(booking.dropoff)}`
      );
    }
    if (existing?.pax !== booking.pax) {
      changes.push(`Passagers : ${existing?.pax ?? "—"} → ${booking.pax}`);
    }
    if (existing?.luggage !== booking.luggage) {
      changes.push(`Bagages : ${existing?.luggage ?? "—"} → ${booking.luggage}`);
    }
    const existingNote =
      existing?.bookingNotes && existing.bookingNotes.length
        ? existing.bookingNotes[existing.bookingNotes.length - 1]?.content
        : "";
    const updatedNote =
      booking.bookingNotes && booking.bookingNotes.length
        ? booking.bookingNotes[booking.bookingNotes.length - 1]?.content
        : "";
    if (existingNote !== updatedNote && updatedNote) {
      changes.push(`Note ajoutée : ${updatedNote}`);
    }

    const when = booking.dateTime.toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const manageUrl =
      process.env.NEXTAUTH_URL || process.env.AUTH_URL
        ? `${process.env.NEXTAUTH_URL || process.env.AUTH_URL}/espace-client`
        : "/espace-client";
    const priceText =
      typeof booking.priceCents === "number"
        ? `${(booking.priceCents / 100).toFixed(2)} €`
        : "À confirmer";
    const userInfo = (session.user as { name?: string; email?: string; phone?: string }) || {};
    const baseMail = {
      status: "pending" as const,
      badgeLabel: "Réservation modifiée",
      statusLabel: "Modification en attente de confirmation",
      title: "Votre modification est prise en compte",
      intro:
        "Nous examinons votre demande de modification et revenons vers vous rapidement. Détail de votre trajet mis à jour :",
      blockTitle: "Détails de votre trajet",
      bookingRef: `CMD-${booking.id}`,
      pickupDateTime: when,
      pickupAddress: formatAddress(booking.pickup),
      dropoffAddress: formatAddress(booking.dropoff),
      passengers: `${booking.pax}`,
      luggage: `${booking.luggage ?? 0}`,
      paymentMethod: priceText,
      manageUrl,
      contactName: userInfo.name ?? "",
      contactEmail: userInfo.email ?? "",
      contactPhone: userInfo.phone ?? "",
      phone: site.phone,
      email: site.email,
      brandCity: site.address.city ?? "Tignieu-Jameyzieu",
      preheader: "Votre réservation a été modifiée.",
      siteUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "",
      privacyUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/politique-de-confidentialite`,
      legalUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/mentions-legales`,
      changes,
    };

    const mailForUser = userEmail
      ? buildBookingEmail({
          ...baseMail,
          to: userEmail,
        })
      : null;
    const mailForSite =
      siteEmail && siteEmail !== userEmail
        ? buildBookingEmail({
            ...baseMail,
            to: siteEmail,
            title: "Demande de modification client",
          })
        : null;

    if (mailForUser) {
      sendMail(mailForUser).catch((err) => console.error("Erreur mail modif booking user", err));
    }
    if (mailForSite) {
      sendMail(mailForSite).catch((err) => console.error("Erreur mail modif booking site", err));
    }
  } catch (err) {
    console.error("Erreur envoi mail modification booking", err);
  }

  return NextResponse.json({ booking }, { status: 200 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" || typeof body?.id === "number" ? String(body.id) : null;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!id || !note) {
    return NextResponse.json({ error: "Identifiant ou note manquants" }, { status: 400 });
  }

  const existing = await prisma.booking.findUnique({
    where: { id },
    include: { invoice: true, driver: { select: { email: true, name: true, phone: true } } },
  });
  const isOwner = existing?.userId === session.user.id;
  const adminList =
    process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
  const isAdmin =
    Boolean(session.user.isAdmin) ||
    (session.user.email && adminList.includes(session.user.email.toLowerCase()));

  if (!existing || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED" || existing.invoice) {
    return NextResponse.json(
      { error: "Impossible d'annuler une réservation terminée, annulée ou facturée." },
      { status: 409 }
    );
  }

  await prisma.bookingNote.create({
    data: { content: note, bookingId: id, authorId: session.user.id },
  });
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: { pickup: true, dropoff: true, bookingNotes: { orderBy: { createdAt: "asc" } } },
  });

  const userEmail = session.user.email;
  const driverEmail = existing.driver?.email;
  const when = booking.dateTime.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  const formatAddr = (addr?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    postalCode?: string | null;
  }) =>
    `${addr?.name ?? ""} ${addr?.street ?? ""} ${addr?.postalCode ?? ""} ${addr?.city ?? ""}`.trim();
  const site = await getSiteContact().catch(() => ({
    phone: "",
    email: "",
    address: { city: "Tignieu-Jameyzieu" },
  }));

  const buildMail = (to: string | null | undefined, title: string, intro: string) =>
    to
      ? buildBookingEmail({
          status: "cancelled",
          to,
          badgeLabel: "Réservation annulée",
          statusLabel: "Annulée",
          title,
          intro,
          bookingRef: `CMD-${booking.id}`,
          pickupDateTime: when,
          pickupAddress: formatAddr(booking.pickup),
          dropoffAddress: formatAddr(booking.dropoff),
          passengers: `${booking.pax}`,
          luggage: `${booking.luggage ?? 0}`,
          paymentMethod: booking.priceCents ? `${(booking.priceCents / 100).toFixed(2)} €` : "—",
          manageUrl: "/espace-client/bookings",
          changes: [`Motif : ${note}`],
          phone: site.phone,
          email: site.email,
          brandCity: site.address.city ?? "Tignieu-Jameyzieu",
          preheader: "Votre réservation a été annulée",
          siteUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "",
          privacyUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/politique-de-confidentialite`,
          legalUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/mentions-legales`,
        })
      : null;

  const mailUser = buildMail(
    userEmail,
    "Votre réservation a été annulée",
    "Votre demande est annulée. Détails ci-dessous."
  );
  const mailDriver = driverEmail
    ? buildMail(
        driverEmail,
        "Course annulée",
        "La course qui vous était assignée a été annulée par le client."
      )
    : null;
  if (mailUser) sendMail(mailUser).catch(() => {});
  if (mailDriver) sendMail(mailDriver).catch(() => {});

  return NextResponse.json({ booking }, { status: 200 });
}
