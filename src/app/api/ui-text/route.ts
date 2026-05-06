import { NextResponse } from "next/server";
import { getUiTexts } from "@/lib/admin-sheet";

// 공개 엔드포인트 (비밀번호 불필요 — 텍스트는 민감정보 아님)
export async function GET() {
  const texts = await getUiTexts();
  return NextResponse.json({ texts });
}
