import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRIVER_EMAILS = [
  "driver1@seed.test",
  "driver2@seed.test",
  "driver3@seed.test",
  "driver4@seed.test",
  "driver5@seed.test",
];

const CUSTOMER_EMAILS = Array.from({ length: 20 }).map((_, idx) => `user${idx + 1}@seed.test`);

const pickups = [
  "114 B route de Crémieu, Tignieu-Jameyzieu",
  "3 rue du Travail, Pont-de-Chéruy",
  "Gare de Lyon Part-Dieu",
  "Aéroport de Marseille",
  "Centre-ville de Lyon",
  "Aéroport de Genève",
];

const dropoffs = [
  "Aéroport de Lyon-Saint Exupéry",
  "Gare TGV Saint-Exupéry",
  "Aéroport de Marseille",
  "Gare Part-Dieu",
  "Aéroport de Genève",
  "114 B route de Crémieu, Tignieu-Jameyzieu",
];

const statuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

function randChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomFutureDate(daysAhead = 30) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysAhead * 24 * 60 * 60 * 1000);
  return new Date(now + offset);
}

async function ensureDrivers() {
  return Promise.all(
    DRIVER_EMAILS.map((email, idx) =>
      prisma.user.upsert({
        where: { email },
        update: { isDriver: true, name: `Chauffeur ${idx + 1}` },
        create: {
          email,
          name: `Chauffeur ${idx + 1}`,
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
        update: {},
        create: {
          email,
          name: `Client ${idx + 1}`,
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
  console.log(`Bookings existants: ${existingCount}. À créer: ${toCreate}.`);

  for (let i = 0; i < toCreate; i += 1) {
    const customer = randChoice(customers);
    const driver = Math.random() < 0.6 ? randChoice(drivers) : null;
    const status = driver ? "CONFIRMED" : randChoice(statuses);
    const dt = randomFutureDate(60);
    await prisma.booking.create({
      data: {
        pickup: randChoice(pickups),
        dropoff: randChoice(dropoffs),
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
  console.log(`Avis existants: ${existingCount}. À créer: ${toCreate}.`);
  const approvedStatuses = ["APPROVED", "PENDING"];

  for (let i = 0; i < toCreate; i += 1) {
    const user = randChoice(customers);
    const booking = bookings.length ? randChoice(bookings) : null;
    await prisma.review.create({
      data: {
        userId: user.id,
        bookingId: booking ? booking.id : null,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        comment: `Avis seed #${i + 1} — service impeccable et ponctuel.`,
        status: randChoice(approvedStatuses),
      },
    });
  }
}

async function main() {
  console.log("Démarrage du seed…");
  const drivers = await ensureDrivers();
  const customers = await ensureCustomers();
  await seedBookings(drivers, customers);
  const allBookings = await prisma.booking.findMany({ select: { id: true } });
  await seedReviews(customers, allBookings);
  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
