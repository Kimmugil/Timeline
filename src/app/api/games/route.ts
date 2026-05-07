import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { getGames, createGame } from "@/lib/admin-sheet";

// GET: 공개 – 누구나 게임 목록 조회 가능
export async function GET() {
  const games = await getGames();
  return NextResponse.json({ games });
}

// POST: 관리자 비밀번호 필요
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, dcRawSheetId, dcSheetTab, forumRawSheetId, adminPassword } = body as {
    name: string;
    dcRawSheetId: string;
    dcSheetTab: string;
    forumRawSheetId: string;
    adminPassword: string;
  };

  if (!await verifyPassword(adminPassword || "")) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "게임명이 필요합니다." }, { status: 400 });
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-");

  const game = await createGame({
    name: name.trim(),
    slug,
    dcRawSheetId: dcRawSheetId || "",
    dcSheetTab: dcSheetTab || "시트1",
    forumRawSheetId: forumRawSheetId || "",
  });

  return NextResponse.json({ game }, { status: 201 });
}
