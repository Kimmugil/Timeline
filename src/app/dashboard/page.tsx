"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameConfig } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchGames() {
    const res = await fetch("/api/games");
    if (res.ok) {
      const data = await res.json();
      setGames(data.games);
    }
    setLoading(false);
  }

  useEffect(() => { fetchGames(); }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-20" style={{ borderBottom: "2px solid #1A1A1A" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎮</span>
            <h1 className="text-lg font-black" style={{ color: "var(--text)" }}>게임 이슈 타임라인</h1>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="neo-btn text-xs px-3 py-1.5"
            style={{ background: "var(--bg)" }}
          >
            🔑 관리자
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="neo-card h-36 animate-pulse" style={{ background: "#F0EFEC" }} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="neo-card text-center py-20 px-6">
            <p className="text-2xl mb-3">🎮</p>
            <p className="font-bold mb-4" style={{ color: "var(--text-2)" }}>등록된 게임이 없습니다.</p>
            <button
              onClick={() => router.push("/admin")}
              className="neo-btn px-6 py-3 text-sm"
              style={{ background: "var(--accent)" }}
            >
              관리자 패널에서 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((game) => (
              <div
                key={game.id}
                className="neo-card neo-card-hover p-5"
                onClick={() => router.push(`/dashboard/${game.id}`)}
              >
                <h2 className="text-base font-black mb-0.5" style={{ color: "var(--text)" }}>{game.name}</h2>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                  등록일: {new Date(game.created_at).toLocaleDateString("ko-KR")}
                </p>

                <div className="space-y-1.5 mb-5">
                  <StatusDot on={!!game.dc_raw_sheet_id} onText="DC 갤러리 시트 연결됨" offText="DC 갤러리 시트 미연결" />
                  <StatusDot on={!!game.forum_raw_sheet_id} onText="포럼 시트 연결됨" offText="포럼 시트 미연결" />
                  <StatusDot on={!!game.processed_sheet_id} onText="타임라인 시트 생성됨" offText="타임라인 시트 미생성" accent />
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/${game.id}`); }}
                  className="neo-btn w-full py-2.5 text-sm"
                  style={{ background: "var(--accent)" }}
                >
                  타임라인 보기 →
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusDot({ on, onText, offText, accent }: {
  on: boolean; onText: string; offText: string; accent?: boolean;
}) {
  const color = on ? (accent ? "#3b82f6" : "#10b981") : "#D1D5DB";
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: on ? "var(--text-2)" : "var(--text-muted)" }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {on ? onText : offText}
    </div>
  );
}
