export type CityInfo = {
  slug: string;
  name: string;
  heroTitle: string;
  heroSubtitle: string;
  description: string;
  poiPrices: { label: string; price: string }[];
  highlights: string[];
};

export const cities: CityInfo[] = [
  {
    slug: "tignieu",
    name: "Tignieu-Jameyzieu",
    heroTitle: "Taxi à Tignieu-Jameyzieu",
    heroSubtitle: "Aéroport, gares et trajets du quotidien en quelques minutes",
    description:
      "Chauffeur implanté à Tignieu-Jameyzieu : prise en charge rapide vers Saint-Exupéry, Part-Dieu ou vos rendez-vous locaux. Suivi temps réel, confort berline ou van, assistance bagages et trajets CPAM sur demande.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "35 €" },
      { label: "Gare Part-Dieu", price: "69 €" },
      { label: "Centre de Lyon", price: "75 €" },
    ],
    highlights: [
      "Chauffeur local disponible 24/7",
      "Confirmation SMS et suivi d'approche",
      "Options berline/van et trajets CPAM selon besoin",
    ],
  },
  {
    slug: "charvieu-chavagneux",
    name: "Charvieu-Chavagneux",
    heroTitle: "Taxi à Charvieu-Chavagneux",
    heroSubtitle: "Transferts rapides vers Lyon et le Nord Isère",
    description:
      "Départs express depuis Charvieu-Chavagneux vers Saint-Exupéry, Eurexpo ou les gares lyonnaises. Accueil pancarte en arrivée, assistance bagages et horaires souples pour vos équipes.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "32 €" },
      { label: "Gare Part-Dieu", price: "72 €" },
      { label: "Eurexpo", price: "55 €" },
    ],
    highlights: [
      "Suivi des vols et retards inclus",
      "Paiement sécurisé, facture envoyée",
      "Flotte berline/van selon affluence",
    ],
  },
  {
    slug: "pont-de-cheruy",
    name: "Pont-de-Chéruy",
    heroTitle: "Taxi à Pont-de-Chéruy",
    heroSubtitle: "Vos trajets pro et perso, en confiance",
    description:
      "Prise en charge depuis Pont-de-Chéruy pour vos trajets professionnels, familiaux ou longue distance. Chauffeurs référencés, ponctualité et confort premium.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "38 €" },
      { label: "Gare Part-Dieu", price: "75 €" },
      { label: "Eurexpo", price: "58 €" },
    ],
    highlights: [
      "Accueil pancarte à l'aéroport",
      "Accompagnement personnalisé et trajets CPAM",
      "Support WhatsApp/SMS en temps réel",
    ],
  },
  {
    slug: "cremieu",
    name: "Crémieu",
    heroTitle: "Taxi à Crémieu",
    heroSubtitle: "Navettes aéroport, longues distances et tourisme",
    description:
      "Un chauffeur habitué aux ruelles de Crémieu : départs matinaux vers l'aéroport, liaisons longues distances ou circuits touristiques dans le Nord-Isère.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "42 €" },
      { label: "Gare Part-Dieu", price: "82 €" },
      { label: "Bourgoin-Jallieu", price: "48 €" },
    ],
    highlights: [
      "Tarifs annoncés et confirmés",
      "Arrêts photo ou visites possibles",
      "7 places sur demande (van)",
    ],
  },
  {
    slug: "meyzieu",
    name: "Meyzieu",
    heroTitle: "Taxi à Meyzieu",
    heroSubtitle: "Solution rapide pour Eurexpo, aéroports et bureaux",
    description:
      "Départs à Meyzieu pour Eurexpo, la Part-Dieu ou l’aéroport. Idéal pour vos équipes en salon, vos clients et vos déplacements quotidiens.",
    poiPrices: [
      { label: "Eurexpo", price: "32 €" },
      { label: "Aéroport Lyon Saint-Exupéry", price: "28 €" },
      { label: "Gare Part-Dieu", price: "45 €" },
    ],
    highlights: [
      "Coordination multi-pickup pour salons",
      "Horaires étendus matin/nuit",
      "Badge et accès événement si besoin",
    ],
  },
  {
    slug: "pusignan",
    name: "Pusignan",
    heroTitle: "Taxi à Pusignan",
    heroSubtitle: "Prise en charge express à deux pas de l’aéroport",
    description:
      "Chauffeur basé près de Pusignan pour transferts vers Saint-Exupéry, pôles industriels et gares lyonnaises. Communication proactive et confort garanti.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "22 €" },
      { label: "Gare Part-Dieu", price: "48 €" },
      { label: "Eurexpo", price: "36 €" },
    ],
    highlights: [
      "Suivi d'approche en temps réel",
      "Facturation claire pour entreprises",
      "Chauffeurs référencés",
    ],
  },
  {
    slug: "chavanoz",
    name: "Chavanoz",
    heroTitle: "Taxi à Chavanoz",
    heroSubtitle: "Trajets quotidiens, aéroports et santé",
    description:
      "Depuis Chavanoz, navettes vers aéroports, gares ou rendez-vous importants. Chauffeurs agréés et accompagnement des proches.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "34 €" },
      { label: "Gare Part-Dieu", price: "72 €" },
      { label: "Gare de Bourgoin-Jallieu", price: "52 €" },
    ],
    highlights: [
      "Transport assis professionnalisé",
      "Aide bagages et accompagnement",
      "Disponibilité 24/7",
    ],
  },
  {
    slug: "janneyrias",
    name: "Janneyrias",
    heroTitle: "Taxi à Janneyrias",
    heroSubtitle: "Chauffeur proche de l'aéroport et des zones d'affaires",
    description:
      "Départs immédiats depuis Janneyrias pour Saint-Exupéry, Eurexpo ou Lyon. Parfait pour vols matinaux, rendez-vous clients et retours tardifs.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "20 €" },
      { label: "Eurexpo", price: "34 €" },
      { label: "Gare Part-Dieu", price: "46 €" },
    ],
    highlights: [
      "Temps d’approche réduit",
      "Accueil pancarte sur demande",
      "Paiement sécurisé & facture instantanée",
    ],
  },
  {
    slug: "loyettes",
    name: "Loyettes",
    heroTitle: "Taxi à Loyettes",
    heroSubtitle: "Trajets rapides vers aéroport, gares et zones d’activités",
    description:
      "Depuis Loyettes, prise en charge vers Saint-Exupéry, les gares lyonnaises et vos rendez-vous professionnels. Service fiable, suivi en temps réel et confort berline ou van.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "33 €" },
      { label: "Gare Part-Dieu", price: "72 €" },
      { label: "Gare Lyon Perrache", price: "76 €" },
    ],
    highlights: [
      "Réservation simple 24/7",
      "Assistance bagages à la demande",
      "Facturation claire et confirmation rapide",
    ],
  },
  {
    slug: "saint-romain-de-jalionas",
    name: "Saint-Romain-de-Jalionas",
    heroTitle: "Taxi à Saint-Romain-de-Jalionas",
    heroSubtitle: "Chauffeur local pour vos transferts pro et personnels",
    description:
      "Départs depuis Saint-Romain-de-Jalionas vers l’aéroport, Eurexpo, les gares et les trajets longue distance. Ponctualité, conduite souple et communication proactive avant la prise en charge.",
    poiPrices: [
      { label: "Aéroport Lyon Saint-Exupéry", price: "30 €" },
      { label: "Gare Part-Dieu", price: "68 €" },
      { label: "Eurexpo", price: "49 €" },
    ],
    highlights: [
      "Suivi d'approche SMS/WhatsApp",
      "Chauffeurs agréés et assurés",
      "Options berline et van selon le besoin",
    ],
  },
];

export const getCity = (slug: string): CityInfo | undefined =>
  cities.find((city) => city.slug === slug);
