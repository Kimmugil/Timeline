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
    if (res.ok) setGames((await res.json()).games);
    setLoading(false);
  }

  useEffect(() => { fetchGames(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎮</span>
            <span className="text-sm font-semibold text-white">게임 이슈 타임라인</span>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-gray-800"
          >
            🔑 관리자
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg h-36 animate-pulse" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg text-center py-20">
            <p className="text-gray-400 text-sm mb-4">등록된 게임이 없습니다.</p>
            <button
              onClick={() => router.push("/admin")}
              className="bg-gray-900 hover:bg-gray-700 text-white text-sm px-5 py-2 rounded-lg transition-colors"
            >
              관리자 패널에서 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/${game.id}`)}
              >
                <h2 className="text-sm font-semibold text-gray-900 mb-0.5">{game.name}</h2>
                <p className="text-xs text-gray-400 mb-4">
                  등록일: {new Date(game.created_at).toLocaleDateString("ko-KR")}
                </p>

                <div className="space-y-1.5 mb-4">
                  <StatusDot on={!!game.dc_raw_sheet_id} onText="DC 갤러리 시트 연결됨" offText="DC 갤러리 시트 미연결" />
                  <StatusDot on={!!game.forum_raw_sheet_id} onText="포럼 시트 연결됨" offText="포럼 시트 미연결" />
                  <StatusDot on={!!game.processed_sheet_id} onText="타임라인 시트 생성됨" offText="타임라인 시트 미생성" accent />
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/${game.id}`); }}
                  className="w-full bg-gray-900 hover:bg-gray-700 text-white text-xs py-2 rounded-lg transition-colors"
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
  const dotColor = on ? (accent ? "bg-blue-400" : "bg-emerald-400") : "bg-gray-300";
  return (
    <div className={`flex items-center gap-2 text-xs ${on ? "text-gray-600" : "text-gray-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      {on ? onText : offText}
    </div>
  );
}
