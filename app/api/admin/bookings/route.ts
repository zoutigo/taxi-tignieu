import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildBookingEmail, sendMail } from "@/lib/mailer";
import { getSiteContact } from "@/lib/site-config";
import { bookingUpdateSchema } from "@/lib/validation/booking-update";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

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
  const parsed = bookingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const {
    id,
    pickup,
    dropoff,
    pickupLabel,
    dropoffLabel,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
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

  if (process.env.NODE_ENV !== "production") {
    console.log("[admin/bookings PATCH] payload", parsed.data);
  }

  if (status === "COMPLETED" && !(completionNotes && completionNotes.trim().length > 0)) {
    return NextResponse.json(
      { error: "Une note est requise pour clôturer la réservation." },
      { status: 400 }
    );
  }

  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
      pickup: true,
      dropoff: true,
      invoice: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }
  if (existing.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Impossible de modifier une réservation déjà annulée." },
      { status: 409 }
    );
  }
  if (existing.status === "COMPLETED" || existing.invoice) {
    return NextResponse.json(
      { error: "Impossible de modifier une réservation terminée ou facturée." },
      { status: 409 }
    );
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
  const pickupValue = pickupLabel ?? pickup;
  const dropoffValue = dropoffLabel ?? dropoff;

  const pickupUpdate: Record<string, unknown> = {};
  if (pickupValue !== undefined) {
    pickupUpdate.name = pickupValue;
    pickupUpdate.street = pickupValue;
  }
  if (pickupLat !== undefined) pickupUpdate.latitude = pickupLat;
  if (pickupLng !== undefined) pickupUpdate.longitude = pickupLng;
  if (Object.keys(pickupUpdate).length > 0) {
    data.pickup = { update: pickupUpdate };
  }

  const dropoffUpdate: Record<string, unknown> = {};
  if (dropoffValue !== undefined) {
    dropoffUpdate.name = dropoffValue;
    dropoffUpdate.street = dropoffValue;
  }
  if (dropoffLat !== undefined) dropoffUpdate.latitude = dropoffLat;
  if (dropoffLng !== undefined) dropoffUpdate.longitude = dropoffLng;
  if (Object.keys(dropoffUpdate).length > 0) {
    data.dropoff = { update: dropoffUpdate };
  }
  if (date && time) data.dateTime = new Date(`${date}T${time}`);
  if (passengers !== undefined) data.pax = passengers;
  if (luggage !== undefined) data.luggage = luggage;
  if (babySeat !== undefined) data.babySeat = babySeat;
  if (completionNotes !== undefined && status === "COMPLETED") {
    // handled via bookingNote creation below
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
    const statusChangedToCompleted =
      parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED";
    const isEditionSubmit =
      (parsed.data.status === undefined || parsed.data.status === existing.status) &&
      ["passengers", "luggage", "priceCents", "distanceKm", "notes", "date", "time"].some(
        (k) => (parsed.data as Record<string, unknown>)[k] !== undefined
      );
    if (!statusChangedToConfirmed && !statusChangedToCompleted && !isEditionSubmit) return;

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

    const clientEmail =
      booking.user?.email ?? booking.customer?.email ?? session?.user?.email ?? null;
    const clientName =
      booking.user?.name ?? booking.customer?.fullName ?? booking.user?.email ?? "Client";
    const clientPhone = booking.user?.phone ?? booking.customer?.phone ?? "";

    const driverEmail = booking.driver?.email ?? null;
    const driverName = booking.driver?.name ?? booking.driver?.email ?? "";
    const driverPhone = booking.driver?.phone ?? "";

    if (statusChangedToConfirmed) {
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
          changes: parsed.data.notes ? [`Note : ${parsed.data.notes}`] : [],
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
          changes: parsed.data.notes ? [`Note : ${parsed.data.notes}`] : [],
        });
        sendMail(mailToUser).catch((err) => console.error("Erreur mail confirmation client", err));
      }
    }

    if (statusChangedToCompleted && hasEmail(clientEmail)) {
      const reviewUrl = `${siteUrl}/avis`;
      const mailCompleted = buildBookingEmail({
        to: clientEmail as string,
        status: "completed",
        badgeLabel: "Course terminée",
        statusLabel: "Votre course est clôturée",
        title: "Votre course est terminée",
        intro:
          "Votre trajet est terminé. Vous recevrez votre facturation sous peu. Vous pouvez aussi laisser un avis sur notre site.",
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
        contactName: driverName || clientName,
        contactEmail: driverEmail ?? site.email,
        contactPhone: driverPhone || site.phone,
        phone: site.phone,
        email: site.email,
        brandCity: site.address.city ?? "Tignieu-Jameyzieu",
        preheader: "Course clôturée",
        siteUrl,
        privacyUrl,
        legalUrl,
        changes: [
          `Note de clôture : ${completionNotes?.trim() ?? ""}`,
          `Laisser un avis : ${reviewUrl}`,
        ],
      });
      sendMail(mailCompleted).catch((err) => console.error("Erreur mail clôture client", err));
    }

    if (isEditionSubmit && hasEmail(clientEmail)) {
      const site = await getSiteContact();
      const manageUrl =
        process.env.NEXTAUTH_URL || process.env.AUTH_URL
          ? `${process.env.NEXTAUTH_URL || process.env.AUTH_URL}/espace-client/bookings`
          : "/espace-client/bookings";
      const when = booking.dateTime.toLocaleString("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      });
      const priceText =
        booking.priceCents != null
          ? `${(booking.priceCents / 100).toFixed(2)} € (estimé)`
          : "À confirmer";
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
        contactName: clientName,
        contactEmail: booking.user?.email ?? booking.customer?.email ?? "",
        contactPhone: clientPhone,
        phone: site.phone,
        email: site.email,
        brandCity: site.address.city ?? "Tignieu-Jameyzieu",
        preheader: "Votre réservation a été modifiée.",
        siteUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "",
        privacyUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/politique-de-confidentialite`,
        legalUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/mentions-legales`,
        changes: parsed.data.notes ? [`Note : ${parsed.data.notes}`] : [],
      };
      const mailUser = buildBookingEmail({ ...baseMail, to: clientEmail as string });
      const adminEmail = process.env.ADMIN_EMAILS?.split(",")
        .map((e) => e.trim())
        .find(Boolean);
      const mailAdmin = adminEmail
        ? buildBookingEmail({
            ...baseMail,
            to: adminEmail,
            title: "Demande de modification client",
          })
        : null;
      sendMail(mailUser).catch((err) => console.error("Erreur mail modif booking user", err));
      if (mailAdmin) {
        sendMail(mailAdmin).catch((err) => console.error("Erreur mail modif booking admin", err));
      }
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
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!id || !note) {
    return NextResponse.json({ error: "Identifiant ou note manquants" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      invoice: true,
      driver: { select: { email: true, name: true, phone: true } },
      user: true,
      pickup: true,
      dropoff: true,
    },
  });
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }
  if (booking.status === "COMPLETED" || booking.status === "CANCELLED" || booking.invoice) {
    return NextResponse.json(
      { error: "Impossible de supprimer une réservation terminée, annulée ou facturée." },
      { status: 409 }
    );
  }

  await prisma.bookingNote.create({
    data: { content: note, bookingId: id, authorId: session?.user?.id ?? null },
  });

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      customer: { select: { fullName: true, phone: true, email: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
      pickup: true,
      dropoff: true,
      bookingNotes: { orderBy: { createdAt: "asc" } },
      invoice: true,
    },
  });

  const site = await getSiteContact().catch(() => ({
    phone: "",
    email: "",
    address: { city: "Tignieu-Jameyzieu" },
  }));
  const when = updated.dateTime.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  const formatAddr = (addr?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    postalCode?: string | null;
  }) =>
    `${addr?.name ?? ""} ${addr?.street ?? ""} ${addr?.postalCode ?? ""} ${addr?.city ?? ""}`.trim();

  const mailUser =
    updated.user?.email || updated.customer?.email
      ? buildBookingEmail({
          status: "cancelled",
          to: (updated.user?.email ?? updated.customer?.email) as string,
          badgeLabel: "Réservation annulée",
          statusLabel: "Annulée",
          title: "Votre réservation est annulée",
          intro: "Votre demande a été annulée. Retrouvez le détail ci-dessous.",
          bookingRef: `CMD-${updated.id}`,
          pickupDateTime: when,
          pickupAddress: formatAddr(updated.pickup),
          dropoffAddress: formatAddr(updated.dropoff),
          passengers: `${updated.pax}`,
          luggage: `${updated.luggage ?? 0}`,
          paymentMethod: updated.priceCents ? `${(updated.priceCents / 100).toFixed(2)} €` : "—",
          manageUrl: "/espace-client/bookings",
          changes: [`Motif : ${note}`],
          phone: site.phone,
          email: site.email,
          brandCity: site.address.city ?? "Tignieu-Jameyzieu",
          preheader: "Votre réservation a été annulée.",
          siteUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "",
          privacyUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/politique-de-confidentialite`,
          legalUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/mentions-legales`,
        })
      : null;

  const mailDriver = booking.driver?.email
    ? buildBookingEmail({
        status: "cancelled",
        to: booking.driver.email,
        badgeLabel: "Course annulée",
        statusLabel: "Annulée",
        title: "Course annulée",
        intro: "La course assignée a été annulée.",
        bookingRef: `CMD-${updated.id}`,
        pickupDateTime: when,
        pickupAddress: formatAddr(updated.pickup),
        dropoffAddress: formatAddr(updated.dropoff),
        passengers: `${updated.pax}`,
        luggage: `${updated.luggage ?? 0}`,
        paymentMethod: updated.priceCents ? `${(updated.priceCents / 100).toFixed(2)} €` : "—",
        manageUrl: "/dashboard/bookings",
        changes: [`Motif : ${note}`],
        phone: site.phone,
        email: site.email,
        brandCity: site.address.city ?? "Tignieu-Jameyzieu",
        preheader: "Course annulée",
        siteUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "",
        privacyUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/politique-de-confidentialite`,
        legalUrl: `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ""}/mentions-legales`,
      })
    : null;

  if (mailUser) sendMail(mailUser).catch(() => {});
  if (mailDriver) sendMail(mailDriver).catch(() => {});

  return NextResponse.json({ booking: updated }, { status: 200 });
}
