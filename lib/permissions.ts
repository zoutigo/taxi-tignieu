import { prisma } from "@/lib/prisma";
import {
  dashboardModules,
  defaultPermissionForModule,
  roles,
  type PermissionFlag,
  type PermissionRole,
} from "@/lib/roles";

export type ModulePermissionMap = Record<string, PermissionFlag>;

type RoleName = PermissionRole | "ADMIN" | "USER";

export function getUserRole(user: {
  isAdmin?: boolean;
  isManager?: boolean;
  isDriver?: boolean;
}): RoleName {
  if (user?.isAdmin) return "ADMIN";
  if (user?.isManager) return "MANAGER";
  if (user?.isDriver) return "DRIVER";
  return "USER";
}

export async function getPermissionsForUser(user: {
  isAdmin?: boolean;
  isManager?: boolean;
  isDriver?: boolean;
}): Promise<ModulePermissionMap> {
  const role = getUserRole(user);
  if (role === "ADMIN") {
    return Object.fromEntries(
      dashboardModules.map((mod) => [
        mod.id,
        {
          module: mod.id,
          role: "MANAGER",
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      ])
    );
  }

  if (!roles.includes(role as PermissionRole)) {
    return Object.fromEntries(
      dashboardModules.map((mod) => [mod.id, defaultPermissionForModule(mod.id, "MANAGER")])
    );
  }

  const dbPerms = await prisma.rolePermission.findMany({
    where: { role },
  });

  const map: ModulePermissionMap = {};
  dashboardModules.forEach((mod) => {
    const match = dbPerms.find((p) => p.module === mod.id);
    map[mod.id] = match
      ? {
          module: mod.id,
          role: role as PermissionRole,
          canView: match.canView,
          canCreate: match.canCreate,
          canUpdate: match.canUpdate,
          canDelete: match.canDelete,
        }
      : defaultPermissionForModule(mod.id, role as PermissionRole);
  });

  return map;
}
