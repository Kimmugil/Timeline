import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGameById, updateGame, deleteGame } from "@/lib/admin-sheet";

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const game = await getGameById(params.gameId);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ game });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  await updateGame(params.gameId, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await deleteGame(params.gameId);
  return NextResponse.json({ ok: true });
}
