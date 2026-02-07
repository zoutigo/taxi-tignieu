import { PrismaClient } from "@prisma/client";
import {
  AVATARS,
  CUSTOMER_EMAILS,
  DRIVER_EMAILS,
  DROPOFFS,
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  PICKUPS,
  REVIEW_COMMENTS,
  STATUSES,
  FEATURED_ZONE_SEED,
  FEATURED_TYPE_SEED,
} from "./data/seed-static-data.js";
import { serviceSeedData } from "./service-seed-data.js";

const prisma = new PrismaClient();

function randChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomFutureDate(daysAhead = 30) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysAhead * 24 * 60 * 60 * 1000);
  return new Date(now + offset);
}

function parseAddress(label) {
  const cpMatch = label.match(/(\d{5})/);
  const postalCode = cpMatch?.[1] ?? null;
  const parts = label
    .split(/[,|-]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const street = parts[0] ?? label;
  const city = parts.find((p) => p && p !== postalCode && /[a-zA-Z]{3,}/.test(p)) ?? null;
  return { label, street, postalCode, city, country: "France" };
}

async function createAddress(label) {
  const parsed = parseAddress(label);
  return prisma.address.create({
    data: {
      name: parsed.label,
      street: parsed.street,
      postalCode: parsed.postalCode,
      city: parsed.city,
      country: parsed.country,
      latitude: null,
      longitude: null,
    },
  });
}

async function ensureDrivers() {
  const existing = await prisma.user.count({ where: { email: { in: DRIVER_EMAILS } } });
  if (existing > 0) {
    console.log("Skip drivers seed (already populated)");
    return prisma.user.findMany({ where: { email: { in: DRIVER_EMAILS } } });
  }
  const created = await Promise.all(
    DRIVER_EMAILS.map((email, idx) =>
      prisma.user.create({
        data: {
          email,
          name: `Chauffeur ${idx + 1}`,
          image: AVATARS[idx % AVATARS.length],
          isDriver: true,
          isAdmin: false,
          isManager: false,
        },
      })
    )
  );
  console.log(`Seeded ${created.length} drivers`);
  return created;
}

async function ensureCustomers() {
  const existing = await prisma.user.count({ where: { email: { in: CUSTOMER_EMAILS } } });
  if (existing > 0) {
    console.log("Skip customers seed (already populated)");
    return prisma.user.findMany({ where: { email: { in: CUSTOMER_EMAILS } } });
  }
  const created = await Promise.all(
    CUSTOMER_EMAILS.map((email, idx) =>
      prisma.user.create({
        data: {
          email,
          name: `Client ${idx + 1}`,
          image: AVATARS[(idx + DRIVER_EMAILS.length) % AVATARS.length],
          isDriver: false,
          isAdmin: false,
          isManager: false,
        },
      })
    )
  );
  console.log(`Seeded ${created.length} customers`);
  return created;
}

async function seedBookings(drivers, customers) {
  const existingCount = await prisma.booking.count();
  if (existingCount > 0) {
    console.log("Skip bookings seed (already populated)");
    return;
  }
  const target = 100;
  for (let i = 0; i < target; i += 1) {
    const customer = randChoice(customers);
    const driver = Math.random() < 0.6 ? randChoice(drivers) : null;
    const status = driver ? "CONFIRMED" : randChoice(STATUSES);
    const dt = randomFutureDate(60);
    const pickupLabel = randChoice(PICKUPS);
    const dropoffLabel = randChoice(DROPOFFS);
    const pickupAddr = await createAddress(pickupLabel);
    const dropoffAddr = await createAddress(dropoffLabel);
    await prisma.booking.create({
      data: {
        pickupId: pickupAddr.id,
        dropoffId: dropoffAddr.id,
        dateTime: dt,
        pax: Math.floor(Math.random() * 3) + 1,
        luggage: Math.floor(Math.random() * 4),
        babySeat: Math.random() < 0.2,
        priceCents: Math.random() < 0.1 ? null : Math.floor(25 + Math.random() * 120) * 100,
        status,
        userId: customer.id,
        driverId: driver ? driver.id : null,
        bookingNotes: {
          create: {
            content: "Course de démonstration (seed)",
            authorId: customer.id,
          },
        },
      },
    });
  }
}

async function seedReviews(customers, bookings) {
  const existingCount = await prisma.review.count();
  if (existingCount > 0) {
    console.log("Skip reviews seed (already populated)");
    return;
  }
  const target = 70;
  const approvedStatuses = ["APPROVED", "PENDING"];

  for (let i = 0; i < target; i += 1) {
    const user = randChoice(customers);
    const booking = bookings.length ? randChoice(bookings) : null;
    await prisma.review.create({
      data: {
        userId: user.id,
        bookingId: booking ? booking.id : null,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
        status: randChoice(approvedStatuses),
      },
    });
  }
}

async function seedServices() {
  const existing = await prisma.sCategory.count();
  if (existing > 0) {
    console.log("Skip services seed (already populated)");
    return;
  }

  for (const [catIndex, cat] of serviceSeedData.entries()) {
    const createdCategory = await prisma.sCategory.create({
      data: {
        slug: cat.slug,
        title: cat.title,
        summary: cat.summary,
        position: cat.position ?? catIndex + 1,
        services: {
          create: cat.services.map((svc, svcIndex) => ({
            slug: svc.slug ?? `${cat.slug}-${svcIndex + 1}`,
            title: svc.title,
            description: svc.description,
            isEnabled: svc.isEnabled ?? true,
            position: svc.position ?? svcIndex + 1,
            highlights: {
              create: (svc.highlights ?? []).map((h, hIndex) => ({
                label: h,
                position: hIndex + 1,
              })),
            },
          })),
        },
      },
    });
    console.log(`Seeded category ${createdCategory.title}`);
  }
}

async function seedFaqCategories() {
  const existingCount = await prisma.faqCategory.count();
  if (existingCount > 0) {
    console.log("Skip FAQ categories seed (already populated)");
    return;
  }

  await prisma.faqCategory.createMany({
    data: FAQ_CATEGORIES.map((name) => ({
      name,
      order: 0,
    })),
  });
}

async function seedFaqs() {
  const existingFaqs = await prisma.faq.count();
  if (existingFaqs > 0) {
    console.log("Skip FAQ seed (already populated)");
    return;
  }

  const categories = await prisma.faqCategory.findMany({ select: { id: true, name: true } });
  const map = new Map(categories.map((c) => [c.name, c.id]));

  const data = Object.entries(FAQ_ITEMS).flatMap(([categoryName, items]) => {
    const categoryId = map.get(categoryName) ?? null;
    return items.map((item) => ({
      question: item.question,
      answer: item.answer,
      isFeatured: false,
      isValidated: true,
      categoryId,
    }));
  });

  await prisma.faq.createMany({ data });
}

function parseEuroToCents(label) {
  const num = Number(
    String(label)
      .replace(/[^\d.,]/g, "")
      .replace(",", ".")
  );
  if (Number.isFinite(num)) return Math.round(num * 100);
  return null;
}

async function seedFeaturedTrips() {
  const existingTrips = await prisma.featuredTrip.count();
  if (existingTrips > 0) {
    console.log("Skip FeaturedTrips and pois seed (already populated)");
    return;
  }
  for (const city of FEATURED_ZONE_SEED) {
    const pickupLabel = city.name;
    const poiDestinations = (city.poiPrices ?? []).map((poi, idx) => ({
      label: poi.label,
      priceCents: parseEuroToCents(poi.price),
      order: idx,
    }));

    const trip = await prisma.featuredTrip.create({
      data: {
        slug: city.slug,
        title: city.name,
        summary: city.summary ?? "",
        featuredSlot: "ZONE",
        pickupLabel,
        dropoffLabel: poiDestinations[0]?.label ?? null,
        distanceKm: null,
        durationMinutes: null,
        basePriceCents: poiDestinations[0]?.priceCents ?? null,
        priority: city.priority ?? 100,
        active: true,
        badge: city.badge ?? "Zone desservie",
        zoneLabel: city.badge ?? undefined,
      },
    });

    if (poiDestinations.length) {
      await prisma.featuredPoi.createMany({
        data: poiDestinations.map((p) => ({ ...p, tripId: trip.id })),
      });
    }
  }

  for (const trip of FEATURED_TYPE_SEED) {
    const created = await prisma.featuredTrip.create({
      data: {
        slug: trip.slug,
        title: trip.title,
        summary: trip.summary ?? "",
        featuredSlot: "TYPE",
        pickupLabel: trip.pickupLabel,
        dropoffLabel: trip.dropoffLabel ?? null,
        basePriceCents: trip.basePriceCents ?? null,
        priority: trip.priority ?? 10,
        active: true,
        badge: trip.badge ?? "Trajet type",
        zoneLabel: null,
      },
    });

    if (trip.dropoffLabel) {
      await prisma.featuredPoi.create({
        data: {
          label: trip.dropoffLabel,
          priceCents: trip.basePriceCents ?? null,
          order: 0,
          tripId: created.id,
        },
      });
    }
  }
  console.log("Seeded featured trips and POI");
}

async function main() {
  // démarrage seed
  const drivers = await ensureDrivers();
  const customers = await ensureCustomers();
  await seedBookings(drivers, customers);
  const allBookings = await prisma.booking.findMany({ select: { id: true } });
  await seedReviews(customers, allBookings);
  await seedServices();
  await seedFaqCategories();
  await seedFaqs();
  await seedFeaturedTrips();
  // fin seed
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
