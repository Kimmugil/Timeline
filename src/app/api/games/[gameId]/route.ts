import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { getGameById, updateGame, deleteGame } from "@/lib/admin-sheet";

// GET: 공개
export async function GET(
  _req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const game = await getGameById(params.gameId);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ game });
}

// PATCH: 관리자 비밀번호 필요
export async function PATCH(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const body = await req.json();
  if (!await verifyPassword(body.adminPassword || "")) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await updateGame(params.gameId, body);
  return NextResponse.json({ ok: true });
}

// DELETE: 관리자 비밀번호 필요
export async function DELETE(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  let adminPassword = "";
  try {
    const body = await req.json();
    adminPassword = body.adminPassword || "";
  } catch { /* body 없을 수도 있음 */ }

  if (!await verifyPassword(adminPassword)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await deleteGame(params.gameId);
  return NextResponse.json({ ok: true });
}
