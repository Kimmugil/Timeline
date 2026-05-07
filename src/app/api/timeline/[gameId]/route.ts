import { NextRequest, NextResponse } from "next/server";
import { getGameById } from "@/lib/admin-sheet";
import { readTimelineFromSheet } from "@/lib/sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const game = await getGameById(params.gameId);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!game.processed_sheet_id) {
    return NextResponse.json({ items: [] });
  }

  const items = await readTimelineFromSheet(game.processed_sheet_id);
  return NextResponse.json({ items });
}
