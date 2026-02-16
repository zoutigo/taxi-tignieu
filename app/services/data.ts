import { prisma } from "@/lib/prisma";

export type ServiceItem = {
  title: string;
  description: string;
  highlights?: string[];
};

export type ServiceGroup = {
  slug: string;
  title: string;
  summary: string;
  items: ServiceItem[];
};

export const serviceGroups: ServiceGroup[] = [
  {
    slug: "particuliers",
    title: "Particuliers",
    summary:
      "Déplacements du quotidien, transferts gare/aéroport et longues distances en toute sérénité.",
    items: [
      {
        title: "Trajets classiques",
        description:
          "Nous assurons tous vos déplacements du quotidien : travail, rendez-vous, courses, visites familiales ou sorties.\n\nTaxi Tignieu-Chavanoz intervient rapidement à Tignieu, Charvieu, Pont-de-Chéruy et dans tout le Nord Isère. Ponctualité, confort et sécurité sont nos priorités.\n\nCourses locales, accompagnement enfants ou seniors, horaires souples et suivi SMS.",
        highlights: [
          "Suivi d'approche par SMS/WhatsApp",
          "Aide bagages et installation passager",
          "Horaires étendus matin et nuit",
        ],
      },
      {
        title: "Aéroport / Gare",
        description:
          "Nous assurons vos transferts vers l’aéroport Lyon Saint-Exupéry, la gare Part-Dieu, Perrache et toutes les gares de la région. Suivi des vols, prise en charge ponctuelle, assistance bagages et confort premium pour voyager en toute sérénité.",
        highlights: [
          "Tracking des vols et retards",
          "Accueil pancarte en arrivée",
          "Assistance bagages et poussettes",
        ],
      },
      {
        title: "Longue distance",
        description:
          "Vous avez un trajet longue distance ? Taxi Tignieu-Chavanoz vous accompagne partout en France : Lyon, Grenoble, Chambéry, Annecy, Valence, Paris et autres destinations. Tarifs clairs, confort optimal et chauffeur professionnel.",
        highlights: [
          "Planification des pauses et itinéraires",
          "Chargeurs et eau à bord sur demande",
          "Suivi temps réel partageable",
        ],
      },
    ],
  },
  {
    slug: "professionnels",
    title: "Professionnels",
    summary:
      "Taxi Tignieu-Chavanoz accompagne les entreprises, hôtels et organisateurs d’événements dans leurs besoins de transport professionnel. Nous proposons un service fiable, discret et ponctuel, avec possibilité de facturation mensuelle.",
    items: [
      {
        title: "Entreprises",
        description:
          "Transport de collaborateurs, clients, partenaires ou dirigeants. Nous assurons vos déplacements professionnels avec sérieux et efficacité. Facturation mensuelle possible pour les comptes entreprises.",
        highlights: [
          "Coordination multi-pickup",
          "Reporting et facturation claire",
          "Chauffeurs référencés pour vos équipes",
        ],
      },
      {
        title: "Séminaires",
        description:
          "Nous prenons en charge le transport des participants vers les centres de séminaires, hôtels, salles de conférence et lieux d’événements autour de Lyon et dans toute la région.",
        highlights: [
          "Flotte dédiée jour J",
          "Accueil signalétique personnalisée",
          "Point de contact unique",
        ],
      },
      {
        title: "Hôtels",
        description:
          "Service de transport pour hôtels et hébergements touristiques : transferts aéroport, gares, excursions et déplacements clients avec un service premium. Transferts VIP, accueil soigné, options van ou berline selon le volume de passagers.",
        highlights: [
          "Prise en charge 24/7",
          "Van ou berline selon affluence",
          "Accueil soigné des clients VIP",
        ],
      },
    ],
  },
  {
    slug: "specialises",
    title: "Spécialisés",
    summary:
      "Sécurité et confort sont au cœur de nos engagements. Accompagnement sécurisé et adapté : scolaire, seniors et trajets conventionnés CPAM.",
    items: [
      {
        title: "Scolaire",
        description:
          "Transport d’enfants vers les écoles, collèges, lycées, centres spécialisés. Service sécurisé, accompagnement rassurant et régularité sur l’année. Ramassages réguliers, itinéraires fiables, chauffeurs référencés et rassurants.",
        highlights: [
          "Chauffeurs identifiés et constants",
          "Communication avec les parents",
          "Itinéraires et horaires stables",
        ],
      },
      {
        title: "Accompagnement seniors & CPAM",
        description:
          "Accompagnement des seniors pour rendez-vous, visites familiales et trajets du quotidien. Nous proposons aussi des trajets conventionnés CPAM sur demande.",
        highlights: [
          "Aide à la montée et descente",
          "Conduite souple et rassurante",
          "Convention CPAM sur demande",
        ],
      },
      {
        title: "Assistance bagages",
        description:
          "Prise en charge avec assistance bagages et équipements volumineux pour aéroports, gares et longues distances.",
        highlights: [
          "Aide chargement/déchargement",
          "Gestion des bagages volumineux",
          "Confort préservé pendant le trajet",
        ],
      },
    ],
  },
  {
    slug: "premium",
    title: "Premium",
    summary: "Confort, image soignée et flexibilité pour vos invités et événements.",
    items: [
      {
        title: "Van / Groupes",
        description:
          "Transport de groupes, familles, amis, touristes avec véhicules spacieux 7 à 9 places. Parfait pour les voyages avec bagages, sorties et événements.",
        highlights: [
          "Sièges confort et clim régulée",
          "Gestion des bagages volumineux",
          "Option wifi/boissons sur demande",
        ],
      },
      {
        title: "Événementiel",
        description:
          "Taxi pour mariages, fêtes, concerts, anniversaires, manifestations sportives. Chauffeur dédié, horaires adaptés, retour en toute sécurité.Chauffeur dédié, disponibilité à la journée, coordination avec vos équipes terrain.",
        highlights: [
          "Mise à disposition à la journée",
          "Brief et coordination avec staff",
          "Gestion des imprévus et retards",
        ],
      },
      {
        title: "Stations de ski",
        description:
          "Transport vers les Alpes, stations de ski et séjours montagne. Véhicule adapté aux bagages et équipements, confort hiver garanti. neige, gestion des retards météo, départs matinaux et retours tardifs.",
        highlights: [
          "Pneus/chaînes neige prêts",
          "Suivi météo et horaires flexibles",
          "Aide bagages skis et valises",
        ],
      },
    ],
  },
  {
    slug: "bonus",
    title: "Bonus",
    summary: "Services complémentaires pour aller plus loin que le simple trajet.",
    items: [
      {
        title: "Transport express",
        description:
          "Livraison rapide de documents, plis urgents, petits colis, matériel professionnel et objets sensibles. Livraison urgente de plis/colis, suivi en temps réel et remise en main propre.",
        highlights: [
          "Remise en main propre",
          "Preuve de livraison envoyée",
          "Traçabilité temps réel",
        ],
      },
      {
        title: "Tourisme",
        description:
          "Visites touristiques, circuits sur mesure, routes des vins, excursions en Isère, dans le Rhône et les Alpes. Circuits découverte, arrêts photo, recommandations locales et timing flexible.",
        highlights: [
          "Itinéraires personnalisés",
          "Arrêts photo et visites",
          "Conseils restos/activités",
        ],
      },
    ],
  },
];

export async function getServiceGroups(options?: {
  includeDisabled?: boolean;
}): Promise<ServiceGroup[]> {
  const includeDisabled = options?.includeDisabled ?? false;
  try {
    const categories = await prisma.sCategory.findMany({
      orderBy: { position: "asc" },
      include: {
        services: {
          orderBy: { position: "asc" },
          include: {
            highlights: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    if (!categories.length) {
      return serviceGroups;
    }

    return categories.map((category) => ({
      slug: category.slug,
      title: category.title,
      summary: category.summary,
      items: category.services
        .filter((svc) => includeDisabled || svc.isEnabled)
        .map((svc) => ({
          title: svc.title,
          description: svc.description,
          highlights: svc.highlights.map((h) => h.label),
        })),
    }));
  } catch (error) {
    console.error("Impossible de charger les services depuis la base, fallback statique :", error);
    return serviceGroups;
  }
}
