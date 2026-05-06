import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGameById, updateGameProcessedSheet } from "@/lib/admin-sheet";
import { readForumSheet, readDcSheet, writeTimelineToSheet } from "@/lib/sheets";
import { generateTimeline } from "@/lib/gemini";
import { createOrGetProcessedSheet } from "@/lib/gas";

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const game = await getGameById(params.gameId);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { fromDate, toDate } = (await req.json()) as {
    fromDate: string;
    toDate: string;
  };

  if (!fromDate || !toDate) {
    return NextResponse.json(
      { error: "fromDate, toDate가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    // 1. processed 시트 확인/생성
    let processedSheetId = game.processed_sheet_id;
    if (!processedSheetId) {
      processedSheetId = await createOrGetProcessedSheet(game.name);
      await updateGameProcessedSheet(game.id, processedSheetId);
    }

    // 2. raw 데이터 로드
    const [forumPosts, dcPosts] = await Promise.all([
      game.forum_raw_sheet_id
        ? readForumSheet(game.forum_raw_sheet_id)
        : Promise.resolve([]),
      game.dc_raw_sheet_id
        ? readDcSheet(game.dc_raw_sheet_id, game.dc_sheet_tab, {
            minViews: 50,
            minComments: 3,
            fromDate,
            toDate,
          })
        : Promise.resolve([]),
    ]);

    // 3. AI 분석 + 타임라인 생성
    const items = await generateTimeline(
      {
        id: 0, // not used in gemini.ts logic
        name: game.name,
        dc_raw_sheet_id: game.dc_raw_sheet_id,
        dc_sheet_tab: game.dc_sheet_tab,
        forum_raw_sheet_id: game.forum_raw_sheet_id,
      },
      fromDate,
      toDate,
      forumPosts,
      dcPosts
    );

    // 4. processed 시트에 기록
    await writeTimelineToSheet(processedSheetId, items);

    return NextResponse.json({
      ok: true,
      itemCount: items.length,
      processedSheetId,
    });
  } catch (err) {
    console.error("AI generate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
