import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { adminPassword } = await req.json();
  if (!await verifyPassword(adminPassword || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sheetId = process.env.ADMIN_SHEET_ID || "";
  return NextResponse.json({
    adminSheetUrl: sheetId
      ? `https://docs.google.com/spreadsheets/d/${sheetId}`
      : null,
  });
}
