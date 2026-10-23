import { NextResponse } from "next/server";

import { getMarketSnapshot } from "@/lib/dreamdex/markets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getMarketSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read dreamDEX markets.";

    return NextResponse.json(
      { error: message, checkedAt: new Date().toISOString() },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
