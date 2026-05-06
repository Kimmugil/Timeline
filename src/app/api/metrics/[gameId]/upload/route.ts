import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGameById, upsertMetrics, updateGameMetricColumns } from "@/lib/db";

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gameId = parseInt(params.gameId);
  const game = await getGameById(gameId);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const text = await req.text();
  const { headers, rows } = parseCSV(text);

  if (!headers.includes("date")) {
    return NextResponse.json(
      { error: "CSV에 'date' 컬럼이 필요합니다." },
      { status: 400 }
    );
  }

  const metricColumns = headers.filter((h) => h !== "date");
  const entries = rows
    .filter((row) => row.date)
    .map((row) => {
      const data: Record<string, number> = {};
      metricColumns.forEach((col) => {
        const val = parseFloat(row[col].replace(/,/g, ""));
        if (!isNaN(val)) data[col] = val;
      });
      return { date: row.date, data };
    });

  await upsertMetrics(gameId, entries);
  await updateGameMetricColumns(gameId, metricColumns);

  return NextResponse.json({
    ok: true,
    uploadedRows: entries.length,
    metricColumns,
  });
}
