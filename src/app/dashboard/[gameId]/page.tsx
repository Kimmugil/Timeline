"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameConfig, TimelineItem, TimelineItemType } from "@/lib/types";
import { useUiText } from "@/lib/use-ui-text";
import TimelineCards from "@/components/TimelineCards";
import AiGenerateButton from "@/components/AiGenerateButton";

// ──────────────────────────────────────────
// 이벤트 유형 요약 배지
// ──────────────────────────────────────────
const BADGE_CONFIG: { type: TimelineItemType; label: string; color: string }[] = [
  { type: "official_patch",  label: "패치노트",    color: "#3b82f6" },
  { type: "official_event",  label: "공식 이벤트", color: "#10b981" },
  { type: "official_notice", label: "공지사항",    color: "#f59e0b" },
  { type: "user_issue",      label: "유저 이슈",   color: "#ef4444" },
  { type: "event_reaction",  label: "이벤트 반응", color: "#94a3b8" },
];

function EventSummaryBar({ items }: { items: TimelineItem[] }) {
  const badges = BADGE_CONFIG.map((cfg) => ({
    ...cfg,
    count: items.filter((i) => i.type === cfg.type).length,
  })).filter((b) => b.count > 0);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <span
          key={b.type}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium"
          style={{
            borderColor: b.color + "55",
            color: b.color,
            backgroundColor: b.color + "12",
          }}
        >
          <span className="font-bold">{b.count}</span>
          {b.label}
        </span>
      ))}
      <span className="flex items-center text-xs text-slate-400 pl-1">
        총 {items.filter((i) => i.type !== "weekly_summary").length}건
      </span>
    </div>
  );
}

// ──────────────────────────────────────────
// 메인 페이지
// ──────────────────────────────────────────
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

  const rangeItems = timelineItems.filter(
    (item) => item.date >= fromDate && item.date <= toDate
  );

  const filteredItems = selectedDate
    ? timelineItems.filter((item) => item.date === selectedDate)
    : rangeItems;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">{t("dashboard.loading", "로딩 중...")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── 헤더 ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-slate-400 hover:text-slate-900 transition-colors text-sm"
        >
          {t("timeline.back", "← 목록")}
        </button>

        <h1 className="text-lg font-bold text-slate-900">
          {game?.name || "게임"} 타임라인
        </h1>

        <div className="ml-auto flex items-center gap-2.5 flex-wrap">
          {/* 텍스트 갱신 */}
          <button
            onClick={refreshTexts}
            title="ui_text 시트 동기화"
            className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg"
          >
            ↻
          </button>

          {/* 날짜 범위 */}
          <div className="flex items-center gap-1.5 text-sm">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setSelectedDate(null); }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-sm focus:outline-none focus:border-blue-400"
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setSelectedDate(null); }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {game && (
            <AiGenerateButton
              gameId={game.id}
              fromDate={fromDate}
              toDate={toDate}
              onSuccess={loadData}
              label={t("timeline.generate_ai", "✨ AI 생성")}
            />
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="border border-emerald-400 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            {exporting ? "내보내는 중..." : t("timeline.export_json", "⬇ JSON")}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* ── 기간 요약 배지 ── */}
        {!selectedDate && rangeItems.length > 0 && (
          <EventSummaryBar items={rangeItems} />
        )}

        {/* ── 날짜 선택 시 돌아가기 ── */}
        {selectedDate && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">
              📅 {selectedDate} 이벤트
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-blue-500 hover:underline"
            >
              {t("timeline.show_all", "← 전체 보기")}
            </button>
          </div>
        )}

        {/* ── 주간 리포트 카드 ── */}
        <TimelineCards
          items={filteredItems}
          onDateClick={(date) =>
            setSelectedDate((prev) => (prev === date ? null : date))
          }
          emptyMessage={t(
            "timeline.no_items",
            "이벤트가 없습니다. AI 타임라인 생성 버튼을 눌러 분석을 시작하세요."
          )}
        />
      </main>
    </div>
  );
}
