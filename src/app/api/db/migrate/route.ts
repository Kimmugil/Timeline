import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "No database to migrate." }, { status: 410 });
}
