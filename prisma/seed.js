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
  return Promise.all(
    DRIVER_EMAILS.map((email, idx) =>
      prisma.user.upsert({
        where: { email },
        update: {
          isDriver: true,
          name: `Chauffeur ${idx + 1}`,
          image: AVATARS[idx % AVATARS.length],
        },
        create: {
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
}

async function ensureCustomers() {
  return Promise.all(
    CUSTOMER_EMAILS.map((email, idx) =>
      prisma.user.upsert({
        where: { email },
        update: { image: AVATARS[(idx + DRIVER_EMAILS.length) % AVATARS.length] },
        create: {
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
}

async function seedBookings(drivers, customers) {
  const existingCount = await prisma.booking.count();
  const target = 100;
  const toCreate = Math.max(0, target - existingCount);
  // info log volontairement retiré pour éviter le bruit en CI

  for (let i = 0; i < toCreate; i += 1) {
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
        notes: "Course de démonstration (seed)",
        priceCents: Math.random() < 0.1 ? null : Math.floor(25 + Math.random() * 120) * 100,
        status,
        userId: customer.id,
        driverId: driver ? driver.id : null,
      },
    });
  }
}

async function seedReviews(customers, bookings) {
  const existingCount = await prisma.review.count();
  const target = 70;
  const toCreate = Math.max(0, target - existingCount);
  // info log volontairement retiré pour éviter le bruit en CI
  const approvedStatuses = ["APPROVED", "PENDING"];

  for (let i = 0; i < toCreate; i += 1) {
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
  await prisma.sHighlight.deleteMany();
  await prisma.service.deleteMany();
  await prisma.sCategory.deleteMany();

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
  if (existingCount > 0) return;

  await prisma.faqCategory.createMany({
    data: FAQ_CATEGORIES.map((name) => ({
      name,
      order: 0,
    })),
  });
}

async function seedFaqs() {
  const existingFaqs = await prisma.faq.count();
  if (existingFaqs > 0) return;

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
