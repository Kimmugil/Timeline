import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Metrics are handled locally via local-viewer.html." }, { status: 410 });
}
