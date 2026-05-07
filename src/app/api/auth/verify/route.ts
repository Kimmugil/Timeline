import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { adminPassword } = await req.json();
  const ok = await verifyPassword(adminPassword || "");
  if (!ok) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
