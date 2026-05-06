import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGames, createGame } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const games = await getGames();
  return NextResponse.json({ games });
}

export async function POST(req: NextRequest) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, dcRawSheetId, dcSheetTab, forumRawSheetId } = body as {
    name: string;
    dcRawSheetId: string;
    dcSheetTab: string;
    forumRawSheetId: string;
  };

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
