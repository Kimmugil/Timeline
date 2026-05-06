import { sql } from "@vercel/postgres";

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      dc_raw_sheet_id VARCHAR(200) DEFAULT '',
      dc_sheet_tab VARCHAR(100) DEFAULT '시트1',
      forum_raw_sheet_id VARCHAR(200) DEFAULT '',
      processed_sheet_id VARCHAR(200),
      metric_columns JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS metrics (
      id SERIAL PRIMARY KEY,
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(game_id, date)
    )
  `;
}

export async function getGames() {
  const { rows } = await sql`
    SELECT id, name, slug, dc_raw_sheet_id, dc_sheet_tab, forum_raw_sheet_id,
           processed_sheet_id, metric_columns, created_at
    FROM games ORDER BY created_at DESC
  `;
  return rows;
}

export async function getGameBySlug(slug: string) {
  const { rows } = await sql`
    SELECT id, name, slug, dc_raw_sheet_id, dc_sheet_tab, forum_raw_sheet_id,
           processed_sheet_id, metric_columns, created_at
    FROM games WHERE slug = ${slug}
  `;
  return rows[0] || null;
}

export async function getGameById(id: number) {
  const { rows } = await sql`
    SELECT id, name, slug, dc_raw_sheet_id, dc_sheet_tab, forum_raw_sheet_id,
           processed_sheet_id, metric_columns, created_at
    FROM games WHERE id = ${id}
  `;
  return rows[0] || null;
}

export async function createGame(data: {
  name: string;
  slug: string;
  dcRawSheetId: string;
  dcSheetTab: string;
  forumRawSheetId: string;
}) {
  const { rows } = await sql`
    INSERT INTO games (name, slug, dc_raw_sheet_id, dc_sheet_tab, forum_raw_sheet_id)
    VALUES (${data.name}, ${data.slug}, ${data.dcRawSheetId}, ${data.dcSheetTab}, ${data.forumRawSheetId})
    RETURNING *
  `;
  return rows[0];
}

export async function updateGame(id: number, data: {
  name?: string;
  dcRawSheetId?: string;
  dcSheetTab?: string;
  forumRawSheetId?: string;
}) {
  if (data.name !== undefined) {
    await sql`UPDATE games SET name = ${data.name} WHERE id = ${id}`;
  }
  if (data.dcRawSheetId !== undefined) {
    await sql`UPDATE games SET dc_raw_sheet_id = ${data.dcRawSheetId} WHERE id = ${id}`;
  }
  if (data.dcSheetTab !== undefined) {
    await sql`UPDATE games SET dc_sheet_tab = ${data.dcSheetTab} WHERE id = ${id}`;
  }
  if (data.forumRawSheetId !== undefined) {
    await sql`UPDATE games SET forum_raw_sheet_id = ${data.forumRawSheetId} WHERE id = ${id}`;
  }
}

export async function deleteGame(id: number) {
  await sql`DELETE FROM games WHERE id = ${id}`;
}

export async function updateGameProcessedSheet(gameId: number, processedSheetId: string) {
  await sql`UPDATE games SET processed_sheet_id = ${processedSheetId} WHERE id = ${gameId}`;
}

export async function updateGameMetricColumns(gameId: number, columns: string[]) {
  await sql`UPDATE games SET metric_columns = ${JSON.stringify(columns)} WHERE id = ${gameId}`;
}

export async function upsertMetrics(
  gameId: number,
  entries: Array<{ date: string; data: Record<string, number> }>
) {
  for (const entry of entries) {
    await sql`
      INSERT INTO metrics (game_id, date, data)
      VALUES (${gameId}, ${entry.date}, ${JSON.stringify(entry.data)})
      ON CONFLICT (game_id, date)
      DO UPDATE SET data = ${JSON.stringify(entry.data)}, created_at = NOW()
    `;
  }
}

export async function getMetrics(gameId: number, from?: string, to?: string) {
  if (from && to) {
    const { rows } = await sql`
      SELECT date::text, data FROM metrics
      WHERE game_id = ${gameId} AND date >= ${from}::date AND date <= ${to}::date
      ORDER BY date ASC
    `;
    return rows;
  }
  const { rows } = await sql`
    SELECT date::text, data FROM metrics
    WHERE game_id = ${gameId}
    ORDER BY date ASC
  `;
  return rows;
}
