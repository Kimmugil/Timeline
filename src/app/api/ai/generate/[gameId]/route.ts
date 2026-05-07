import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { getGameById } from "@/lib/admin-sheet";

const GITHUB_REPO = "Kimmugil/Timeline";
const WORKFLOW_FILE = "generate-timeline.yml";

export async function POST(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const body = (await req.json()) as {
    fromDate: string;
    toDate: string;
    adminPassword?: string;
  };

  if (!await verifyPassword(body.adminPassword || "")) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const game = await getGameById(params.gameId);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { fromDate, toDate } = body;
  if (!fromDate || !toDate) {
    return NextResponse.json({ error: "fromDate, toDate가 필요합니다." }, { status: 400 });
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_DISPATCH_TOKEN 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { game_id: params.gameId, from_date: fromDate, to_date: toDate },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("GitHub dispatch error:", text);
    return NextResponse.json(
      { error: `GitHub Actions 트리거 실패: ${res.status}` },
      { status: 500 }
    );
  }

  const actionsUrl = `https://github.com/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}`;
  return NextResponse.json({ ok: true, actionsUrl });
}
