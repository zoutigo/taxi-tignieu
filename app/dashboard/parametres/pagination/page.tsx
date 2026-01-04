import { PaginationPanel } from "@/components/dashboard/pagination-panel";
import { BackButton } from "@/components/back-button";

export default function PaginationSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Pagination du dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Définissez les tailles de page pour les tableaux (réservations, avis, utilisateurs). Les
        valeurs sont stockées dans votre navigateur.
      </p>
      <div className="mt-4">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
      <div className="mt-6">
        <PaginationPanel />
      </div>

      <div className="mt-8">
        <BackButton label="Retour aux paramètres" href="/dashboard/parametres" />
      </div>
    </div>
  );
}
