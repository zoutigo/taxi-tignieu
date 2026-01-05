export const DRIVER_EMAILS = [
  "driver1@seed.test",
  "driver2@seed.test",
  "driver3@seed.test",
  "driver4@seed.test",
  "driver5@seed.test",
];

export const CUSTOMER_EMAILS = Array.from({ length: 20 }).map(
  (_, idx) => `user${idx + 1}@seed.test`
);

export const AVATARS = Array.from({ length: 30 }).map(
  (_, i) => `https://api.dicebear.com/7.x/thumbs/svg?seed=avatar-${i + 1}`
);

export const PICKUPS = [
  "114 B route de Crémieu, Tignieu-Jameyzieu",
  "3 rue du Travail, Pont-de-Chéruy",
  "Gare de Lyon Part-Dieu",
  "Aéroport de Marseille",
  "Centre-ville de Lyon",
  "Aéroport de Genève",
];

export const DROPOFFS = [
  "Aéroport de Lyon-Saint Exupéry",
  "Gare TGV Saint-Exupéry",
  "Aéroport de Marseille",
  "Gare Part-Dieu",
  "Aéroport de Genève",
  "114 B route de Crémieu, Tignieu-Jameyzieu",
];

export const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export const REVIEW_COMMENTS = [
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

export const FAQ_CATEGORIES = [
  "Réservation & fonctionnement",
  "Tarifs & paiements",
  "Services & situations spécifiques",
  "Zones desservies & informations locales",
];

export const FAQ_ITEMS = {
  "Zones desservies & informations locales": [
    {
      question: "Intervenez-vous à Pont-de-Chéruy ?",
      answer:
        "Oui, Pont-de-Chéruy fait partie de notre zone prioritaire. Nous desservons aussi les communes voisines.",
    },
    {
      question: "Faites-vous Crémieu et Meyzieu ?",
      answer:
        "Oui, nous couvrons Crémieu et Meyzieu, avec des trajets fréquents vers les gares et l’aéroport.",
    },
    {
      question: "Jusqu’où vous déplacez-vous ?",
      answer:
        "Nous partons de l’Est lyonnais et pouvons aller partout en France, selon disponibilité et devis.",
    },
    {
      question: "Combien de temps pour rejoindre l’aéroport depuis Tignieu ?",
      answer:
        "En moyenne 20 à 30 minutes selon le trafic. Nous ajustons l’heure de départ pour anticiper les bouchons.",
    },
    {
      question: "Travaillez-vous la nuit et les jours fériés ?",
      answer:
        "Oui, service 24/7 sur réservation. Les majorations légales s’appliquent la nuit et les jours fériés.",
    },
  ],
  "Services & situations spécifiques": [
    {
      question: "Faites-vous les trajets vers l’aéroport Lyon Saint-Exupéry ?",
      answer:
        "Oui, c’est l’une de nos liaisons principales. Nous déposons aux terminaux et halls TGV.",
    },
    {
      question: "Êtes-vous taxi conventionné CPAM / VSL ?",
      answer:
        "Oui, nous sommes conventionnés CPAM pour les transports assis. Pensez à votre bon de transport.",
    },
    {
      question: "Proposez-vous le transport scolaire ?",
      answer:
        "Oui sur demande préalable et selon planning. Nous assurons ponctualité et sécurité des enfants.",
    },
    {
      question: "Transportez-vous des groupes ou des vans ?",
      answer:
        "Nous disposons de véhicules spacieux. Indiquez le nombre de passagers pour réserver le bon véhicule.",
    },
    {
      question: "Faites-vous les longues distances ?",
      answer: "Oui, les trajets longue distance sont possibles sur devis et réservation anticipée.",
    },
    {
      question: "Acceptez-vous les animaux ?",
      answer:
        "Oui, les animaux sont acceptés s’ils sont tenus ou en caisse adaptée. Prévenez-nous à la réservation.",
    },
  ],
  "Tarifs & paiements": [
    {
      question: "Quels sont les tarifs d’un taxi à Tignieu ?",
      answer:
        "Nous appliquons la grille réglementée du Rhône/Isère (prise en charge + tarif au km/temps).",
    },
    {
      question: "Le prix est-il fixé à l’avance ?",
      answer:
        "Une estimation peut être donnée avant le départ. Le montant final suit le taximètre ou le forfait convenu.",
    },
    {
      question: "Acceptez-vous la carte bancaire ?",
      answer:
        "Oui, CB et sans contact sont acceptés à bord, ainsi que les paiements dématérialisés.",
    },
    {
      question: "Y a-t-il des suppléments (bagages, nuit, dimanche) ?",
      answer:
        "Les majorations légales s’appliquent nuit/dimanche/jours fériés. Bagages spéciaux peuvent ajouter un léger supplément.",
    },
    {
      question: "Proposez-vous des forfaits aéroport ?",
      answer:
        "Oui pour certains trajets récurrents. Demandez un devis pour confirmer le forfait applicable.",
    },
    {
      question: "Les tarifs sont-ils réglementés ?",
      answer:
        "Oui, nous respectons la réglementation préfectorale en vigueur (lettre de tarif A/B/C/D).",
    },
  ],
  "Réservation & fonctionnement": [
    {
      question: "Comment réserver un taxi à Tignieu ou Charvieu ?",
      answer:
        "Par téléphone, via le formulaire en ligne ou directement depuis votre espace client.",
    },
    {
      question: "Peut-on réserver un taxi à l’avance ?",
      answer:
        "Oui, la réservation anticipée est conseillée, surtout pour l’aéroport ou tôt le matin.",
    },
    {
      question: "Êtes-vous disponibles 24h/24 et 7j/7 ?",
      answer:
        "Oui, le service fonctionne 24/7 sur réservation. En urgence, appelez-nous pour vérifier la disponibilité.",
    },
    {
      question: "Combien de temps à l’avance faut-il réserver ?",
      answer:
        "Idéalement 12 à 24h pour garantir un chauffeur. Pour les horaires creux, quelques heures peuvent suffire.",
    },
    {
      question: "Puis-je annuler ou modifier une réservation ?",
      answer:
        "Oui, contactez-nous dès que possible. Des frais peuvent s’appliquer en cas d’annulation tardive.",
    },
    {
      question: "Proposez-vous la réservation en ligne ?",
      answer:
        "Oui, via notre site et l’espace client. Nous confirmons ensuite par mail ou téléphone.",
    },
  ],
};
