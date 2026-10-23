import { NextResponse } from "next/server";

import { getAccountRecorderSnapshot } from "@/lib/dreamdex/account";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await context.params;
    const snapshot = await getAccountRecorderSnapshot(address);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read the account lifecycle.";
    const status = message.includes("valid EVM") ? 400 : 502;
    return NextResponse.json(
      { error: message, checkedAt: new Date().toISOString() },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
