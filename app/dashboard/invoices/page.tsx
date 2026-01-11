export const metadata = {
  title: "Factures - Tableau de bord",
  description: "Consultez les factures générées pour vos courses.",
};

export default function InvoicesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Factures</h1>
      <p className="text-muted-foreground">
        La génération de facture est en cours. Revenez dans un instant pour voir vos documents.
      </p>
    </div>
  );
}
