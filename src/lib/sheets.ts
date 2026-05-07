import { google } from "googleapis";
import { ForumPost, DcPost, TimelineItem } from "./types";

function getAuth() {
  const json = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

function parseKoreanDate(dateStr: string): string {
  if (!dateStr) return "";
  const normalized = String(dateStr).replace(/\./g, "-").trim();
  const match = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function parseKoreanTime(dateStr: string): string {
  if (!dateStr) return "";
  const match = String(dateStr).match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function toInt(val: unknown): number {
  return parseInt(String(val || "0").replace(/[^0-9]/g, "")) || 0;
}

function findCol(headers: string[], ...keywords: string[]): number {
  return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
}

export async function readForumSheet(sheetId: string): Promise<ForumPost[]> {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetNames = meta.data.sheets?.map((s) => s.properties?.title || "") || [];

  const posts: ForumPost[] = [];

  for (const sheetName of sheetNames) {
    let type: "notice" | "patch" | "event" | null = null;
    if (sheetName.includes("공지")) type = "notice";
    else if (sheetName.includes("패치")) type = "patch";
    else if (sheetName.includes("이벤트")) type = "event";
    if (!type) continue;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${sheetName}'!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) continue;

    const headers = rows[0].map((h: unknown) => String(h).toLowerCase());
    const idxNum = findCol(headers, "번호", "thread_id", "id", "no");
    const idxTitle = findCol(headers, "제목", "title");
    const idxAuthor = findCol(headers, "작성자", "author");
    const idxDate = findCol(headers, "작성일", "날짜", "date");
    const idxLink = findCol(headers, "링크", "url", "link");
    const idxViews = findCol(headers, "조회", "view_count", "views");
    const idxLikes = findCol(headers, "추천", "likes");
    const idxBody = findCol(headers, "본문", "내용", "content", "body");

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row || row.length === 0) continue;

      const rawDate = String(row[idxDate] ?? "");
      const date = parseKoreanDate(rawDate);
      if (!date) continue;
      const time = parseKoreanTime(rawDate);

      // body may be embedded in the same cell or a later column
      const rawBody =
        idxBody >= 0 ? String(row[idxBody] ?? "") : String(row[row.length - 1] ?? "");

      posts.push({
        id: String(row[idxNum] ?? i),
        title: String(row[idxTitle] ?? ""),
        body: rawBody,
        author: String(row[idxAuthor] ?? ""),
        date,
        time: time || undefined,
        link: String(row[idxLink] ?? ""),
        views: toInt(row[idxViews]),
        likes: toInt(row[idxLikes]),
        type,
      });
    }
  }

  return posts.sort((a, b) => a.date.localeCompare(b.date));
}

export async function readDcSheet(
  sheetId: string,
  tabName = "시트1",
  options: {
    minViews?: number;
    minComments?: number;
    fromDate?: string;
    toDate?: string;
  } = {}
): Promise<DcPost[]> {
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A:I`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0].map((h: unknown) => String(h).toLowerCase());
  const idxNum = findCol(headers, "글번호");
  const idxTitle = findCol(headers, "제목");
  const idxBody = findCol(headers, "본문");
  const idxAuthor = findCol(headers, "작성자");
  const idxDate = findCol(headers, "날짜");
  const idxLink = findCol(headers, "링크");
  const idxComments = findCol(headers, "댓글");
  const idxViews = findCol(headers, "조회");
  const idxLikes = findCol(headers, "추천");

  const { minViews = 50, minComments = 3, fromDate, toDate } = options;
  const posts: DcPost[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;

    const date = parseKoreanDate(String(row[idxDate] ?? ""));
    if (!date) continue;
    if (fromDate && date < fromDate) continue;
    if (toDate && date > toDate) continue;

    const views = toInt(row[idxViews]);
    const comments = toInt(row[idxComments]);
    const likes = toInt(row[idxLikes]);

    if (views < minViews && comments < minComments) continue;

    posts.push({
      id: String(row[idxNum] ?? i),
      title: String(row[idxTitle] ?? ""),
      body: String(row[idxBody] ?? "").slice(0, 500),
      author: String(row[idxAuthor] ?? ""),
      date,
      link: String(row[idxLink] ?? ""),
      comments,
      views,
      likes,
    });
  }

  return posts.sort((a, b) => a.date.localeCompare(b.date));
}

const TIMELINE_HEADERS = [
  "id", "date", "type", "title", "summary", "detail",
  "source_links", "evidence_count", "evidence_metrics",
  "related_event_date", "dc_sentiment", "created_at", "time",
];

export async function writeTimelineToSheet(sheetId: string, items: TimelineItem[]) {
  const sheets = getSheets();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existing = meta.data.sheets?.map((s) => s.properties?.title) || [];

  if (!existing.includes("timeline")) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "timeline" } } }],
      },
    });
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: "timeline!A:M",
  });

  const dataRows = items.map((item) => [
    item.id,
    item.date,
    item.type,
    item.title,
    item.summary,
    item.detail,
    JSON.stringify(item.sourceLinks || []),
    String(item.evidenceCount || 0),
    JSON.stringify(item.evidenceMetrics || {}),
    item.relatedEventDate || "",
    item.dcSentiment || "",
    item.createdAt,
    item.time || "",
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "timeline!A1",
    valueInputOption: "RAW",
    requestBody: { values: [TIMELINE_HEADERS, ...dataRows] },
  });
}

export async function readTimelineFromSheet(sheetId: string): Promise<TimelineItem[]> {
  const sheets = getSheets();

  let response;
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "timeline!A:M",
    });
  } catch {
    return [];
  }

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const items: TimelineItem[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as string[];
    if (!row || !row[0]) continue;

    let evidenceMetrics = null;
    try {
      evidenceMetrics = JSON.parse(row[8] || "{}");
    } catch {
      evidenceMetrics = null;
    }

    items.push({
      id: row[0],
      gameId: "",
      date: row[1],
      type: row[2] as TimelineItem["type"],
      title: row[3] || "",
      summary: row[4] || "",
      detail: row[5] || "",
      sourceLinks: (() => {
        try {
          const parsed = JSON.parse(row[6] || "[]");
          if (Array.isArray(parsed)) return parsed;
          // 구버전 호환: 콤마 구분 URL 문자열
          return row[6].split(",").filter(Boolean).map((url: string) => ({ url, title: url }));
        } catch {
          return row[6] ? row[6].split(",").filter(Boolean).map((url: string) => ({ url, title: url })) : [];
        }
      })(),
      evidenceCount: parseInt(row[7]) || 0,
      evidenceMetrics,
      relatedEventDate: row[9] || null,
      dcSentiment: (row[10] || null) as TimelineItem["dcSentiment"],
      createdAt: row[11] || "",
      time: row[12] || undefined,
    });
  }

  return items;
}
