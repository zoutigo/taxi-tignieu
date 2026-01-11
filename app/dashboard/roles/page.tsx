import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RolesPermissions } from "@/components/dashboard/roles-permissions";
import {
  dashboardModules,
  defaultPermissionForModule,
  roles,
  type PermissionFlag,
} from "@/lib/roles";
import { BackButton } from "@/components/back-button";

export const metadata = {
  title: "Gestion des rôles | Dashboard",
};

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const existing = await prisma.rolePermission.findMany();
  const permissions: PermissionFlag[] = [];
  dashboardModules.forEach((mod) => {
    roles.forEach((role) => {
      const match = existing.find((p) => p.module === mod.id && p.role === role);
      permissions.push(
        match
          ? {
              module: match.module,
              role,
              canView: match.canView,
              canCreate: match.canCreate,
              canUpdate: match.canUpdate,
              canDelete: match.canDelete,
            }
          : defaultPermissionForModule(mod.id, role)
      );
    });
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <BackButton label="Retour au dashboard" href="/dashboard" />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">Rôles</p>
        <h1 className="font-display text-3xl text-foreground">Permissions des rôles</h1>
        <p className="text-sm text-muted-foreground">
          Activez ou désactivez les droits par rôle et module. Filtrez par rôle pour travailler sur
          le manager ou le driver.
        </p>
      </div>

      <RolesPermissions initialPermissions={permissions} />
    </div>
  );
}
