"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameConfig, TimelineItem } from "@/lib/types";
import { useUiText } from "@/lib/use-ui-text";
import TimelineChart from "@/components/TimelineChart";
import TimelineCards from "@/components/TimelineCards";
import AiGenerateButton from "@/components/AiGenerateButton";

export default function GameTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { t, refreshTexts } = useUiText();

  const [game, setGame] = useState<GameConfig | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  const [fromDate, setFromDate] = useState(threeMonthsAgo.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gameRes, timelineRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/timeline/${gameId}`),
      ]);

      if (gameRes.ok) setGame((await gameRes.json()).game);
      if (timelineRes.ok) setTimelineItems((await timelineRes.json()).items || []);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleExport() {
    setExporting(true);
    const res = await fetch(`/api/timeline/${gameId}/export`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timeline_${game?.slug || gameId}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("내보내기 실패: 먼저 AI 타임라인을 생성해주세요.");
    }
    setExporting(false);
  }

  const filteredItems = selectedDate
    ? timelineItems.filter((item) => item.date === selectedDate)
    : timelineItems.filter((item) => item.date >= fromDate && item.date <= toDate);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">{t("dashboard.loading", "로딩 중...")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-slate-400 hover:text-slate-900 transition-colors"
        >
          {t("timeline.back", "← 목록")}
        </button>
        <h1 className="text-xl font-bold text-slate-900">{game?.name || "게임"} 타임라인</h1>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <button
            onClick={refreshTexts}
            title="ui_text 시트 동기화"
            className="text-xs text-slate-400 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            ↻ 텍스트 갱신
          </button>

          {/* 날짜 범위 */}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {game && (
            <AiGenerateButton
              gameId={game.id}
              fromDate={fromDate}
              toDate={toDate}
              onSuccess={loadData}
              label={t("timeline.generate_ai", "✨ AI 타임라인 생성")}
            />
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="border border-emerald-500 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {exporting ? "내보내는 중..." : t("timeline.export_json", "⬇ JSON 내보내기")}
          </button>
        </div>
      </header>

      {/* 안내 배너 */}
      <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-slate-600">
        <span className="text-amber-600 font-semibold">💡 지표(DAU·매출) 확인 방법: </span>
        ①&nbsp;JSON 내보내기 → ②&nbsp;<code className="bg-amber-100 px-1 rounded text-xs">local-viewer.html</code> 열기 → ③&nbsp;JSON + 지표 CSV 불러오기
      </div>

      <main className="p-6 space-y-6">
        {/* Timeline Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-slate-600">
              {t("timeline.chart_title", "이벤트 타임라인")}
            </h2>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-blue-500 hover:underline"
              >
                {t("timeline.show_all", "전체 보기")}
              </button>
            )}
          </div>
          <TimelineChart
            chartData={[]}
            timelineItems={timelineItems.filter(
              (item) => item.date >= fromDate && item.date <= toDate
            )}
            metricColumns={[]}
            onDateClick={(date) =>
              setSelectedDate((prev) => (prev === date ? null : date))
            }
            selectedDate={selectedDate}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {[
            { type: "official_patch", label: "패치노트", color: "#3b82f6" },
            { type: "official_event", label: "공식 이벤트", color: "#10b981" },
            { type: "official_notice", label: "공지사항", color: "#f59e0b" },
            { type: "user_issue", label: "유저 이슈", color: "#ef4444" },
            { type: "weekly_summary", label: "주간 동향", color: "#8b5cf6" },
            { type: "event_reaction", label: "이벤트 반응", color: "#64748b" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>

        {/* Timeline Cards */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-4">
            {selectedDate
              ? `${selectedDate} 이벤트`
              : t("timeline.cards_title", "주간 리포트")}
            <span className="text-slate-400 text-sm font-normal ml-2">
              ({filteredItems.length}건)
            </span>
          </h2>
          <TimelineCards
            items={filteredItems}
            emptyMessage={t("timeline.no_items", "이벤트가 없습니다. AI 타임라인 생성 버튼을 눌러 분석을 시작하세요.")}
          />
        </div>
      </main>
    </div>
  );
}
