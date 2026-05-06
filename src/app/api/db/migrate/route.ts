import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { migrate } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!await getSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await migrate();
    return NextResponse.json({ ok: true, message: "DB 마이그레이션 완료" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
