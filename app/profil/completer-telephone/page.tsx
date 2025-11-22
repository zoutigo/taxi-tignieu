import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PhoneForm } from "@/components/phone-form";

export const metadata: Metadata = {
  title: "Compléter votre profil | Taxi Tignieu",
};

type PhoneCompletionPageProps = {
  searchParams: Promise<{
    from?: string;
  }>;
};

export default async function PhoneCompletionPage({ searchParams }: PhoneCompletionPageProps) {
  const resolvedSearchParams = await searchParams;
  const from = resolvedSearchParams?.from;
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.phone) {
    redirect(from ?? "/espace-client");
  }

  const redirectTo = from ?? "/espace-client";

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="surface p-8">
        <p className="badge-pill mb-4 text-xs text-muted-foreground">Sécurité du compte</p>
        <h1 className="font-display text-3xl text-foreground">Ajoutez votre numéro</h1>
        <p className="mt-2 text-muted-foreground">
          Nous avons besoin d&apos;un numéro de téléphone pour confirmer vos réservations en toute
          sécurité.
        </p>
        <div className="mt-8">
          <PhoneForm defaultPhone={session.user.phone} redirectTo={redirectTo} />
        </div>
      </div>
    </section>
  );
}
