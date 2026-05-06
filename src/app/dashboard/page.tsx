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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`"${name}" 게임을 삭제하시겠습니까?`)) return;
    await fetch(`/api/games/${id}`, { method: "DELETE" });
    fetchGames();
  }

  async function initDB() {
    const res = await fetch("/api/db/migrate", { method: "POST" });
    const data = await res.json();
    alert(data.message || data.error);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <header className="border-b border-[#2d3748] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">🎮 게임 이슈 타임라인</h1>
        <div className="flex gap-3">
          <button
            onClick={initDB}
            className="text-xs text-[#94a3b8] hover:text-white border border-[#2d3748] px-3 py-1.5 rounded-lg transition-colors"
          >
            DB 초기화
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + 게임 등록
          </button>
          <button
            onClick={handleLogout}
            className="text-[#94a3b8] hover:text-white text-sm px-4 py-2 rounded-lg border border-[#2d3748] transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="text-[#94a3b8] text-center py-20">로딩 중...</div>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#94a3b8] mb-4">등록된 게임이 없습니다.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#3b82f6] text-white px-6 py-3 rounded-lg"
            >
              첫 번째 게임 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 hover:border-[#3b82f6] transition-colors"
              >
                <h2 className="text-lg font-semibold mb-1">{game.name}</h2>
                <p className="text-[#94a3b8] text-xs mb-4">
                  등록일: {new Date(game.created_at).toLocaleDateString("ko-KR")}
                </p>

                <div className="space-y-1 text-xs text-[#94a3b8] mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${game.dc_raw_sheet_id ? "bg-green-400" : "bg-gray-600"}`}
                    />
                    DC 갤러리 시트 {game.dc_raw_sheet_id ? "연결됨" : "미연결"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${game.forum_raw_sheet_id ? "bg-green-400" : "bg-gray-600"}`}
                    />
                    포럼 시트 {game.forum_raw_sheet_id ? "연결됨" : "미연결"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${game.processed_sheet_id ? "bg-blue-400" : "bg-gray-600"}`}
                    />
                    타임라인 시트 {game.processed_sheet_id ? "생성됨" : "미생성"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${game.metric_columns?.length > 0 ? "bg-purple-400" : "bg-gray-600"}`}
                    />
                    지표 {game.metric_columns?.length > 0 ? `${game.metric_columns.length}개 컬럼` : "미업로드"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/${game.id}`)}
                    className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm py-2 rounded-lg transition-colors"
                  >
                    타임라인 보기
                  </button>
                  <button
                    onClick={() => handleDelete(game.id, game.name)}
                    className="text-red-400 hover:text-red-300 text-sm px-3 py-2 border border-[#2d3748] rounded-lg transition-colors"
                  >
                    삭제
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
