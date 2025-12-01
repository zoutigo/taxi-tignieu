import { NextResponse } from "next/server";
import { getTariffConfig } from "@/lib/tariff-config";

export async function GET() {
  const config = await getTariffConfig();
  return NextResponse.json(config, { status: 200 });
}
