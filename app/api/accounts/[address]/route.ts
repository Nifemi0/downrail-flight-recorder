import { NextResponse } from "next/server";

import { getAccountRecorderSnapshot } from "@/lib/dreamdex/account";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await context.params;
    const cursor = new URL(request.url).searchParams.get("cursor");
    const snapshot = await getAccountRecorderSnapshot(address, cursor);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read the account lifecycle.";
    const status = message.includes("valid EVM") || message.includes("page cursor") ? 400 : 502;
    return NextResponse.json(
      { error: message, checkedAt: new Date().toISOString() },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
