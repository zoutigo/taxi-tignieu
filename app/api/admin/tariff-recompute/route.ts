import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getLatestTariffRecomputeJob,
  processTariffRecomputeBatch,
} from "@/lib/tariff-recompute-queue";

const isAdminLike = (session: unknown): boolean => {
  const s = session as { user?: { isAdmin?: boolean; isManager?: boolean } } | null;
  return Boolean(s?.user && (s.user.isAdmin || s.user.isManager));
};

export async function GET() {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  const latest = await getLatestTariffRecomputeJob();
  return NextResponse.json({ job: latest }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminLike(session)) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(20, Math.floor(limitRaw)) : 5;
  const result = await processTariffRecomputeBatch(limit);
  return NextResponse.json(result, { status: 200 });
}

export const runtime = "nodejs";
