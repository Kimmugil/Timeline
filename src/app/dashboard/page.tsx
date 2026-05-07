"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameConfig } from "@/lib/types";
import GameRegistrationModal from "@/components/GameRegistrationModal";

export default function DashboardPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function fetchGames() {
    const res = await fetch("/api/games");
    if (res.ok) {
      const data = await res.json();
      setGames(data.games);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGames();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">게임 이슈 타임라인</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + 게임 등록
        </button>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="text-slate-400 text-center py-20">로딩 중...</div>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-4">등록된 게임이 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              첫 번째 게임 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{game.name}</h2>
                <p className="text-slate-400 text-xs mb-4">
                  등록일: {new Date(game.created_at).toLocaleDateString("ko-KR")}
                </p>

                <div className="space-y-1 text-xs text-slate-500 mb-4">
                  <StatusDot
                    on={!!game.dc_raw_sheet_id}
                    onText="DC 갤러리 시트 연결됨"
                    offText="DC 갤러리 시트 미연결"
                  />
                  <StatusDot
                    on={!!game.forum_raw_sheet_id}
                    onText="포럼 시트 연결됨"
                    offText="포럼 시트 미연결"
                  />
                  <StatusDot
                    on={!!game.processed_sheet_id}
                    onText="타임라인 시트 생성됨"
                    offText="타임라인 시트 미생성"
                    color="blue"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/${game.id}`)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-lg transition-colors"
                  >
                    타임라인 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <GameRegistrationModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchGames();
          }}
        />
      )}
    </div>
  );
}

function StatusDot({
  on, onText, offText, color = "green",
}: {
  on: boolean; onText: string; offText: string; color?: "green" | "blue";
}) {
  const dotColor = on
    ? (color === "blue" ? "bg-blue-400" : "bg-emerald-400")
    : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {on ? onText : offText}
    </div>
  );
}
