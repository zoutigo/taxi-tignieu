import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AVATAR_URLS } from "@/lib/avatars";
import { AvatarPicker } from "@/components/avatar-picker";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function ChooseAvatarPage(props: PageProps) {
  const resolved = await Promise.resolve(props.searchParams ?? {});
  const from = typeof resolved?.from === "string" ? resolved.from : "/espace-client";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  if (session.user.image) {
    redirect(from);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Choisir un avatar</h1>
      <p className="text-sm text-muted-foreground">
        Sélectionnez un avatar pour compléter votre profil. Vous pourrez le changer plus tard.
      </p>
      <div className="mt-6">
        <AvatarPicker avatars={AVATAR_URLS} redirectTo={from} />
      </div>
    </div>
  );
}
