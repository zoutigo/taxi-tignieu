import { PrismaClient } from "@prisma/client";
import { serviceSeedData } from "./service-seed-data.js";

const prisma = new PrismaClient();

const DRIVER_EMAILS = [
  "driver1@seed.test",
  "driver2@seed.test",
  "driver3@seed.test",
  "driver4@seed.test",
  "driver5@seed.test",
];

const CUSTOMER_EMAILS = Array.from({ length: 20 }).map((_, idx) => `user${idx + 1}@seed.test`);

const AVATARS = Array.from({ length: 30 }).map(
  (_, i) => `https://api.dicebear.com/7.x/thumbs/svg?seed=avatar-${i + 1}`
);

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

const reviewComments = [
  "Service impeccable, chauffeur ponctuel et voiture très propre. Je recommande sans hésiter.",
  "Trajet agréable, discussion sympa et conduite sécurisante. Merci !",
  "Un peu de retard au départ mais communication claire et trajet fluide ensuite.",
  "Excellente expérience, prise en charge rapide à l'aéroport et aide avec les bagages.",
  "Voiture confortable, bon itinéraire pour éviter les bouchons. Très satisfait.",
  "Chauffeur discret et professionnel, parfait pour travailler pendant le trajet.",
  "Petite bouteille d'eau et musique douce, attention délicate très appréciée.",
  "Trajet nocturne rassurant, conduite prudente et véhicule nickel.",
  "Réactivité au téléphone et adaptation à un changement d'horaire de dernière minute.",
  "Super contact humain, et prix estimé respecté. Je referai appel à vous.",
  "Conduite souple, respect des limitations, on se sent en sécurité.",
  "Quelques minutes de retard mais chauffeur très aimable et excuse présenté.",
  "Très bon service VSL, aide pour l’installation et respect des consignes médicales.",
  "Voiture propre et spacieuse, prise en charge efficace à la gare.",
  "Excellent rapport qualité/prix, réservation simple et confirmation rapide.",
  "Connaissance parfaite de la région, itinéraire optimisé malgré les travaux.",
  "Un léger manque de clim au début, vite réglé. Pour le reste, parfait.",
  "Chauffeur souriant, discussion agréable, et arrivée à l'heure prévue.",
  "Très disponible au téléphone, a attendu malgré un vol en retard.",
  "Aide avec les bagages, installation siège enfant impeccable.",
  "Bonne expérience globale, juste un peu de musique trop forte au départ.",
  "Toujours ponctuels et professionnels, je recommande pour les trajets pro.",
  "VSL bien équipé, prise en charge rassurante, merci pour la patience.",
  "Chauffeur courtois, véhicule récent, confort au top pour longue distance.",
  "Disponible tard le soir, conduite sereine et respectueuse.",
  "Prise en charge rapide, confirmation SMS utile, bon suivi.",
  "Chauffeur très flexible sur l'heure de départ, merci.",
  "Pas de problème, tout s’est bien passé et dans les temps.",
  "Un service premium à prix raisonnable, bravo.",
  "J’ai apprécié le suivi et la communication avant le trajet.",
];

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
    const status = driver ? "CONFIRMED" : randChoice(statuses);
    const dt = randomFutureDate(60);
    const pickupLabel = randChoice(pickups);
    const dropoffLabel = randChoice(dropoffs);
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
        comment: reviewComments[i % reviewComments.length],
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

async function main() {
  // démarrage seed
  const drivers = await ensureDrivers();
  const customers = await ensureCustomers();
  await seedBookings(drivers, customers);
  const allBookings = await prisma.booking.findMany({ select: { id: true } });
  await seedReviews(customers, allBookings);
  await seedServices();
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
