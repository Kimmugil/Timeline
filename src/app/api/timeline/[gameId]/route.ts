import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGameById } from "@/lib/db";
import { readTimelineFromSheet } from "@/lib/sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const game = await getGameById(parseInt(params.gameId));
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!game.processed_sheet_id) {
    return NextResponse.json({ items: [] });
  }

  const items = await readTimelineFromSheet(game.processed_sheet_id);
  return NextResponse.json({ items });
}
