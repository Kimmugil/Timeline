import { getGameById, updateGameProcessedSheet } from "../src/lib/admin-sheet";
import { readForumSheet, readDcSheet, writeTimelineToSheet } from "../src/lib/sheets";
import { generateTimeline } from "../src/lib/gemini";
import { createOrGetProcessedSheet } from "../src/lib/gas";

const gameId = process.env.GAME_ID!;
const fromDate = process.env.FROM_DATE!;
const toDate = process.env.TO_DATE!;

if (!gameId || !fromDate || !toDate) {
  console.error("GAME_ID, FROM_DATE, TO_DATE 환경변수가 필요합니다.");
  process.exit(1);
}

async function main() {
  console.log(`[generate] gameId=${gameId} from=${fromDate} to=${toDate}`);

  const game = await getGameById(gameId);
  if (!game) {
    console.error(`게임을 찾을 수 없습니다: ${gameId}`);
    process.exit(1);
  }

  let processedSheetId = game.processed_sheet_id;
  if (!processedSheetId) {
    console.log("[generate] processed 시트 생성 중...");
    processedSheetId = await createOrGetProcessedSheet(game.name);
    await updateGameProcessedSheet(game.id, processedSheetId);
  }

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

  console.log(`[generate] 포럼 ${forumPosts.length}건, DC ${dcPosts.length}건 로드 완료`);

  const items = await generateTimeline(
    {
      id: game.id,
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

  console.log(`[generate] 타임라인 ${items.length}건 생성 완료, 시트에 저장 중...`);
  await writeTimelineToSheet(processedSheetId, items);
  console.log(`[generate] 완료! processedSheetId=${processedSheetId}`);
}

main().catch((err) => {
  console.error("[generate] 오류:", err);
  process.exit(1);
});
