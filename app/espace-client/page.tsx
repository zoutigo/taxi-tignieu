import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Espace client | Taxi Tignieu",
};

export default async function ClientDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
    },
  });

  if (!user) {
    redirect("/");
  }

  if (!user.phone) {
    const params = new URLSearchParams({ from: "/espace-client" });
    redirect(`/profil/completer-telephone?${params.toString()}`);
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface p-8">
          <p className="badge-pill mb-4 text-xs text-muted-foreground">Espace client</p>
          <h1 className="font-display text-3xl text-foreground">
            Bonjour {user.name ?? "cher client"} 👋
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Retrouvez bientôt ici l&apos;historique de vos trajets, vos demandes en cours et des
            raccourcis pour contacter directement votre chauffeur.
          </p>
          <div className="mt-8 rounded-2xl border border-border/60 bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
            Besoin d&apos;ajuster vos informations ?{" "}
            <Link href="/profil/completer-telephone" className="font-semibold text-primary">
              Modifier mon profil
            </Link>
          </div>
        </div>

        <div className="surface p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Informations personnelles
          </p>
          <div className="mt-6 space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Nom</p>
              <p className="text-base text-foreground">{user.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Email</p>
              <p className="text-base text-foreground">{user.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
                Téléphone
              </p>
              <p className="text-base text-foreground">{user.phone ?? "Non renseigné"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
