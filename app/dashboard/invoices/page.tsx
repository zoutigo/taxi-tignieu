import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InvoicesTable } from "@/components/dashboard/invoices-table";

export const metadata = {
  title: "Factures - Tableau de bord",
  description: "Consultez les factures générées pour vos courses.",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const invoices = await prisma.invoice.findMany({
    orderBy: { issuedAt: "desc" },
    include: { booking: { include: { user: true, customer: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold text-foreground">Factures</h1>
        <p className="text-sm text-muted-foreground">Liste des factures générées.</p>
      </div>

      <InvoicesTable
        invoices={invoices.map((inv) => ({
          id: inv.id,
          client:
            inv.booking?.user?.name ??
            inv.booking?.customer?.fullName ??
            inv.booking?.user?.email ??
            "Client inconnu",
          amountEuros: Number(inv.amount),
          issuedAt: inv.issuedAt.toISOString(),
          pdfPath: inv.pdfPath,
          bookingId: inv.bookingId ?? null,
        }))}
      />
    </div>
  );
}
