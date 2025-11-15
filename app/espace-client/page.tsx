import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Espace client | Taxi Tignieu",
};

export default async function ClientDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="surface p-8">
        <p className="badge-pill mb-4 text-xs text-muted-foreground">Espace client</p>
        <h1 className="font-display text-3xl text-foreground">
          Bonjour {session.user.name ?? "cher client"} 👋
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Votre espace client sera bientôt disponible. Nous y afficherons vos réservations, vos
          préférences ainsi qu’un accès direct à notre support. L’authentification par e-mail et mot
          de passe arrivera également très bientôt.
        </p>
      </div>
    </section>
  );
}
