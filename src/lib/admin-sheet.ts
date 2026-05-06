import { google } from "googleapis";
import { GameConfig } from "./types";

const ADMIN_SHEET_ID = process.env.ADMIN_SHEET_ID!;
const CONFIG_TAB = "config";
const GAMES_TAB = "games";
const UI_TEXT_TAB = "ui_text";

const GAME_HEADERS = [
  "id", "name", "slug", "dc_raw_sheet_id", "dc_sheet_tab",
  "forum_raw_sheet_id", "processed_sheet_id", "created_at",
];

function getAuth() {
  const json = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

async function ensureTab(
  sheets: ReturnType<typeof getSheets>,
  tabName: string,
  headers: string[]
) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ADMIN_SHEET_ID });
  const existing = meta.data.sheets?.map((s) => s.properties?.title) || [];
  if (!existing.includes(tabName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ADMIN_SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
  }
  // Always ensure headers are in row 1
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: ADMIN_SHEET_ID,
    range: `'${tabName}'!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
  });
  const firstRow = headerRes.data.values?.[0] || [];
  if (firstRow[0] !== headers[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `'${tabName}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

async function findRowIndex(
  sheets: ReturnType<typeof getSheets>,
  tabName: string,
  id: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ADMIN_SHEET_ID,
    range: `'${tabName}'!A:A`,
  });
  const ids = (res.data.values || []).slice(1).map((r) => r[0]);
  return ids.indexOf(id); // -1 if not found
}

async function getSheetTabId(
  sheets: ReturnType<typeof getSheets>,
  tabName: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ADMIN_SHEET_ID });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === tabName);
  return sheet?.properties?.sheetId ?? 0;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getConfigValue(key: string): Promise<string | null> {
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `'${CONFIG_TAB}'!A:B`,
    });
    const rows = res.data.values || [];
    const row = rows.find((r) => r[0] === key);
    return row ? String(row[1] ?? "") : null;
  } catch {
    return null;
  }
}

// ─── UI Texts ─────────────────────────────────────────────────────────────────

export async function getUiTexts(): Promise<Record<string, string>> {
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `'${UI_TEXT_TAB}'!A:B`,
    });
    const rows = res.data.values || [];
    const texts: Record<string, string> = {};
    for (const row of rows.slice(1)) {
      if (row[0]) texts[String(row[0])] = String(row[1] ?? "");
    }
    return texts;
  } catch {
    return {};
  }
}

// ─── Games ────────────────────────────────────────────────────────────────────

function rowToGame(row: unknown[]): GameConfig {
  return {
    id: String(row[0] ?? ""),
    name: String(row[1] ?? ""),
    slug: String(row[2] ?? ""),
    dc_raw_sheet_id: String(row[3] ?? ""),
    dc_sheet_tab: String(row[4] ?? "시트1"),
    forum_raw_sheet_id: String(row[5] ?? ""),
    processed_sheet_id: row[6] ? String(row[6]) : null,
    metric_columns: [],
    created_at: String(row[7] ?? ""),
  };
}

export async function getGames(): Promise<GameConfig[]> {
  const sheets = getSheets();
  await ensureTab(sheets, GAMES_TAB, GAME_HEADERS);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ADMIN_SHEET_ID,
    range: `'${GAMES_TAB}'!A:H`,
  });

  const rows = res.data.values || [];
  return rows.slice(1).map(rowToGame).filter((g) => g.id && g.name);
}

export async function getGameById(id: string): Promise<GameConfig | null> {
  const games = await getGames();
  return games.find((g) => g.id === id) ?? null;
}

export async function createGame(data: {
  name: string;
  slug: string;
  dcRawSheetId: string;
  dcSheetTab: string;
  forumRawSheetId: string;
}): Promise<GameConfig> {
  const sheets = getSheets();
  await ensureTab(sheets, GAMES_TAB, GAME_HEADERS);

  const id = `game_${Date.now()}`;
  const now = new Date().toISOString();

  // Use explicit row position instead of append to avoid Google Sheets table detection quirks
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: ADMIN_SHEET_ID,
    range: `'${GAMES_TAB}'!A:A`,
  });
  const nextRow = (existing.data.values?.length ?? 1) + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: ADMIN_SHEET_ID,
    range: `'${GAMES_TAB}'!A${nextRow}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[id, data.name, data.slug, data.dcRawSheetId, data.dcSheetTab, data.forumRawSheetId, "", now]],
    },
  });

  return {
    id, name: data.name, slug: data.slug,
    dc_raw_sheet_id: data.dcRawSheetId, dc_sheet_tab: data.dcSheetTab,
    forum_raw_sheet_id: data.forumRawSheetId,
    processed_sheet_id: null, metric_columns: [], created_at: now,
  };
}

export async function updateGameField(id: string, colIndex: number, value: string) {
  const sheets = getSheets();
  const rowIdx = await findRowIndex(sheets, GAMES_TAB, id);
  if (rowIdx < 0) return;

  const rowNumber = rowIdx + 2; // 1-indexed + header
  const colLetter = String.fromCharCode(65 + colIndex);

  await sheets.spreadsheets.values.update({
    spreadsheetId: ADMIN_SHEET_ID,
    range: `'${GAMES_TAB}'!${colLetter}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

export async function updateGameProcessedSheet(id: string, processedSheetId: string) {
  await updateGameField(id, 6, processedSheetId); // column G (index 6)
}

export async function updateGame(id: string, data: {
  name?: string;
  dcRawSheetId?: string;
  dcSheetTab?: string;
  forumRawSheetId?: string;
}) {
  if (data.name !== undefined) await updateGameField(id, 1, data.name);
  if (data.dcRawSheetId !== undefined) await updateGameField(id, 3, data.dcRawSheetId);
  if (data.dcSheetTab !== undefined) await updateGameField(id, 4, data.dcSheetTab);
  if (data.forumRawSheetId !== undefined) await updateGameField(id, 5, data.forumRawSheetId);
}

export async function deleteGame(id: string) {
  const sheets = getSheets();
  const rowIdx = await findRowIndex(sheets, GAMES_TAB, id);
  if (rowIdx < 0) return;

  const sheetId = await getSheetTabId(sheets, GAMES_TAB);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ADMIN_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowIdx + 1, // +1 for header
            endIndex: rowIdx + 2,
          },
        },
      }],
    },
  });
}
