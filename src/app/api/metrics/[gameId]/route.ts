import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMetrics } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  const metrics = await getMetrics(parseInt(params.gameId), from, to);
  return NextResponse.json({ metrics });
}
