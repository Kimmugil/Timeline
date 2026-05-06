"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameConfig } from "@/lib/types";
import { useUiText } from "@/lib/use-ui-text";
import GameRegistrationModal from "@/components/GameRegistrationModal";
import SetupGuide from "@/components/SetupGuide";

export default function DashboardPage() {
  const router = useRouter();
  const { t, refreshTexts } = useUiText();
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 게임을 삭제하시겠습니까?`)) return;
    await fetch(`/api/games/${id}`, { method: "DELETE" });
    fetchGames();
  }

  const guideSteps = [
    {
      icon: "🎮",
      title: t("guide.step1_title", "① 게임 등록"),
      desc: t("guide.step1_desc", "DC 갤러리 시트와 포럼 시트를 연결하고 게임을 등록하세요."),
      color: "#3b82f6",
    },
    {
      icon: "✨",
      title: t("guide.step2_title", "② AI 타임라인 생성"),
      desc: t("guide.step2_desc", "기간을 선택하고 AI 분석 버튼을 눌러 타임라인을 생성하세요."),
      color: "#8b5cf6",
    },
    {
      icon: "⬇",
      title: t("guide.step3_title", "③ JSON 내보내기"),
      desc: t("guide.step3_desc", "생성된 타임라인을 JSON 파일로 다운로드하세요."),
      color: "#10b981",
    },
    {
      icon: "📊",
      title: t("guide.step4_title", "④ 로컬 뷰어에서 지표 확인"),
      desc: t("guide.step4_desc", "local-viewer.html을 열고 JSON과 지표 CSV를 불러와 차트를 확인하세요."),
      color: "#f59e0b",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <header className="border-b border-[#2d3748] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("dashboard.title", "게임 이슈 타임라인")}</h1>
        <div className="flex gap-3">
          <button
            onClick={refreshTexts}
            title="ui_text 시트와 동기화"
            className="text-xs text-[#94a3b8] hover:text-white border border-[#2d3748] px-3 py-1.5 rounded-lg transition-colors"
          >
            ↻ 텍스트 갱신
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {t("dashboard.add_game", "+ 게임 등록")}
          </button>
          <button
            onClick={handleLogout}
            className="text-[#94a3b8] hover:text-white text-sm px-4 py-2 rounded-lg border border-[#2d3748] transition-colors"
          >
            {t("dashboard.logout", "로그아웃")}
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* 사용 가이드 */}
        <SetupGuide title={t("guide.title", "사용 가이드")} steps={guideSteps} />

        {/* 게임 목록 */}
        {loading ? (
          <div className="text-[#94a3b8] text-center py-20">
            {t("dashboard.loading", "로딩 중...")}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#94a3b8] mb-4">{t("dashboard.no_games", "등록된 게임이 없습니다.")}</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#3b82f6] text-white px-6 py-3 rounded-lg"
            >
              {t("dashboard.add_first", "첫 번째 게임 등록하기")}
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
                  <StatusDot on={!!game.dc_raw_sheet_id}
                    onText={t("dashboard.status_dc_on", "DC 갤러리 시트 연결됨")}
                    offText={t("dashboard.status_dc_off", "DC 갤러리 시트 미연결")} />
                  <StatusDot on={!!game.forum_raw_sheet_id}
                    onText={t("dashboard.status_forum_on", "포럼 시트 연결됨")}
                    offText={t("dashboard.status_forum_off", "포럼 시트 미연결")} />
                  <StatusDot on={!!game.processed_sheet_id}
                    onText={t("dashboard.status_timeline_on", "타임라인 시트 생성됨")}
                    offText={t("dashboard.status_timeline_off", "타임라인 시트 미생성")}
                    color="blue" />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/${game.id}`)}
                    className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm py-2 rounded-lg transition-colors"
                  >
                    {t("dashboard.view_timeline", "타임라인 보기")}
                  </button>
                  <button
                    onClick={() => handleDelete(game.id, game.name)}
                    className="text-red-400 hover:text-red-300 text-sm px-3 py-2 border border-[#2d3748] rounded-lg transition-colors"
                  >
                    {t("dashboard.delete", "삭제")}
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
  const dotColor = on ? (color === "blue" ? "bg-blue-400" : "bg-green-400") : "bg-gray-600";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {on ? onText : offText}
    </div>
  );
}
