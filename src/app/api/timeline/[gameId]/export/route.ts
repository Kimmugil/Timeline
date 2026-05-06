import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGameById } from "@/lib/admin-sheet";
import { readTimelineFromSheet } from "@/lib/sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const game = await getGameById(params.gameId);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!game.processed_sheet_id) {
    return NextResponse.json({ error: "타임라인이 아직 생성되지 않았습니다." }, { status: 404 });
  }

  const items = await readTimelineFromSheet(game.processed_sheet_id);

  const exportData = {
    gameName: game.name,
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="timeline_${game.slug}_${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
