import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mes infos personnelles | Taxi Tignieu",
};

export default async function PersonalInfoPage() {
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
      image: true,
    },
  });

  if (!user) redirect("/");
  if (!user.phone) redirect("/profil/completer-telephone?from=/espace-client/infos-personelles");
  if (!user.image) redirect("/profil/choisir-avatar?from=/espace-client/infos-personelles");

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="surface p-6 sm:p-8">
        <p className="badge-pill text-xs text-muted-foreground">Espace client</p>
        <h1 className="mt-2 font-display text-3xl text-foreground">Mes infos personnelles</h1>
        <p className="text-sm text-muted-foreground">
          Retrouvez vos coordonnées et mettez-les à jour en quelques clics.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-5 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Nom</p>
            <p className="text-base text-foreground">{user.name ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-5 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Email</p>
            <p className="text-base text-foreground">{user.email ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-5 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Téléphone</p>
            <p className="text-base text-foreground">{user.phone ?? "Non renseigné"}</p>
            <Link
              href="/profil/completer-telephone?from=/espace-client/infos-personelles"
              className="mt-2 inline-flex text-sm font-semibold text-primary cursor-pointer"
            >
              Mettre à jour
            </Link>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-5 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">Avatar</p>
            <div className="mt-3 flex items-center gap-3">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "Avatar"}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border border-border/60 object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border border-dashed border-border/70 bg-muted/60" />
              )}
              <Link
                href="/profil/choisir-avatar?from=/espace-client/infos-personelles"
                className="text-sm font-semibold text-primary cursor-pointer"
              >
                Changer d&apos;avatar
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/espace-client/adresses" className="btn btn-ghost cursor-pointer">
            Mes adresses
          </Link>
          <Link href="/espace-client/bookings" className="btn btn-primary cursor-pointer">
            Mes réservations
          </Link>
        </div>
      </div>
    </section>
  );
}
