export type PermissionRole = "MANAGER" | "DRIVER";

export type PermissionFlag = {
  module: string;
  role: PermissionRole;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export const dashboardModules = [
  { id: "users", label: "Utilisateurs" },
  { id: "bookings", label: "Réservations" },
  { id: "services", label: "Services" },
  { id: "reviews", label: "Avis" },
  { id: "faq", label: "FAQ" },
  { id: "site-info", label: "Informations site" },
  { id: "tariffs", label: "Tarifs" },
  { id: "billing", label: "Facturation" },
];

export const roles: PermissionRole[] = ["MANAGER", "DRIVER"];

export const defaultPermissionForModule = (
  module: string,
  role: PermissionRole = "MANAGER"
): PermissionFlag => ({
  module,
  role,
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
});
