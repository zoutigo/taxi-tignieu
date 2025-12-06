import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function BillsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return <p className="p-6 text-sm text-destructive">Accès réservé aux admins.</p>;
  }

  const bills = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { pickup: true, dropoff: true, user: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="badge-pill text-xs text-muted-foreground">Facturation</p>
          <h1 className="font-display text-3xl text-foreground">Factures générées</h1>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Réservation</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Montant</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Fichier</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-t border-border/60">
                <td className="px-4 py-3">{bill.id}</td>
                <td className="px-4 py-3">#{bill.bookingId}</td>
                <td className="px-4 py-3">{bill.booking?.user?.email ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">{(bill.amountCents / 100).toFixed(2)} €</td>
                <td className="px-4 py-3">
                  {new Date(bill.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{bill.pdfPath}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
