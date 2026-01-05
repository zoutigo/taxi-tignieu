import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  dashboardModules,
  defaultPermissionForModule,
  roles,
  type PermissionFlag,
} from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const existing = await prisma.rolePermission.findMany();
  const merged: PermissionFlag[] = [];
  dashboardModules.forEach((mod) => {
    roles.forEach((role) => {
      const match = existing.find((p) => p.module === mod.id && p.role === role);
      merged.push(
        match
          ? {
              module: match.module,
              role: role,
              canView: match.canView,
              canCreate: match.canCreate,
              canUpdate: match.canUpdate,
              canDelete: match.canDelete,
            }
          : defaultPermissionForModule(mod.id, role)
      );
    });
  });

  return NextResponse.json({ permissions: merged }, { status: 200 });
}

type IncomingPermission = {
  module: string;
  role?: string;
  canView?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
};

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { permissions?: IncomingPermission[] };
  if (!Array.isArray(body.permissions)) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const modulesSet = new Set(dashboardModules.map((m) => m.id));
  const rolesSet = new Set(roles);

  const uniquePayload = new Map<string, IncomingPermission>();
  body.permissions.forEach((p) => {
    if (
      typeof p.module === "string" &&
      modulesSet.has(p.module) &&
      (!p.role || rolesSet.has(p.role as unknown as PermissionFlag["role"]))
    ) {
      const role = rolesSet.has(p.role as PermissionFlag["role"])
        ? (p.role as PermissionFlag["role"])
        : ("MANAGER" as PermissionFlag["role"]);
      uniquePayload.set(`${p.module}:${role}`, { ...p, role });
    }
  });

  await Promise.all(
    Array.from(uniquePayload.values()).map((p) =>
      prisma.rolePermission.upsert({
        where: { module_role: { module: p.module, role: p.role as PermissionFlag["role"] } },
        update: {
          role: p.role as PermissionFlag["role"],
          canView: Boolean(p.canView),
          canCreate: Boolean(p.canCreate),
          canUpdate: Boolean(p.canUpdate),
          canDelete: Boolean(p.canDelete),
        },
        create: {
          module: p.module,
          role: p.role as PermissionFlag["role"],
          canView: Boolean(p.canView),
          canCreate: Boolean(p.canCreate),
          canUpdate: Boolean(p.canUpdate),
          canDelete: Boolean(p.canDelete),
        },
      })
    )
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
