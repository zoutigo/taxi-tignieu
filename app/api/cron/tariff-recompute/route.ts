import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processTariffRecomputeBatch } from "@/lib/tariff-recompute-queue";

export async function POST(request: Request) {
  const session = await auth();
  const cronSecret = request.headers.get("x-cron-secret") ?? "";
  const expected = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
  const isAdmin = Boolean(session?.user?.isAdmin || session?.user?.isManager);
  const authorized = isAdmin || (expected.length > 0 && cronSecret === expected);

  if (!authorized) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(20, Math.floor(limitRaw)) : 5;
  const result = await processTariffRecomputeBatch(limit);
  return NextResponse.json(result, { status: 200 });
}

export const runtime = "nodejs";
