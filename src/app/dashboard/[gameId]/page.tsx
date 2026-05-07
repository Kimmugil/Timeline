"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameConfig, TimelineItem, TimelineItemType } from "@/lib/types";
import { useUiText } from "@/lib/use-ui-text";
import TimelineCards from "@/components/TimelineCards";
import CalendarView from "@/components/CalendarView";
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
    <div className="flex flex-wrap gap-2 items-center">
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
      <span className="text-xs text-slate-400">
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

  const [game, setGame]               = useState<GameConfig | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [exporting, setExporting]     = useState(false);

  // 캘린더 현재 월 (기본: 이번 달)
  const todayStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [currentMonth, setCurrentMonth] = useState(todayStr);

  // AI 생성 기간 (헤더 필터)
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  const [fromDate, setFromDate] = useState(threeMonthsAgo.toISOString().slice(0, 10));
  const [toDate, setToDate]     = useState(today.toISOString().slice(0, 10));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gameRes, timelineRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/timeline/${gameId}`),
      ]);
      if (gameRes.ok) setGame((await gameRes.json()).game);
      if (timelineRes.ok) {
        const items: TimelineItem[] = (await timelineRes.json()).items || [];
        setTimelineItems(items);
        // 타임라인이 있으면 가장 최근 이벤트 월로 캘린더 이동
        if (items.length > 0) {
          const latest = [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
          setCurrentMonth(latest.date.slice(0, 7));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 날짜 클릭: 같은 날 다시 클릭하면 선택 해제
  function handleDayClick(date: string) {
    setSelectedDate((prev) => (prev === date ? null : date));
    // 캘린더 월도 해당 날짜 월로
    setCurrentMonth(date.slice(0, 7));
  }

  // 캘린더 월 변경 시 날짜 선택 해제
  function handleMonthChange(month: string) {
    setCurrentMonth(month);
    setSelectedDate(null);
  }

  async function handleExport() {
    setExporting(true);
    const res = await fetch(`/api/timeline/${gameId}/export`);
    if (res.ok) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `timeline_${game?.slug || gameId}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("내보내기 실패: 먼저 AI 타임라인을 생성해주세요.");
    }
    setExporting(false);
  }

  // 카드에 표시할 아이템:
  // - 날짜 선택 시: 해당 날짜
  // - 아니면: 현재 캘린더 월 전체
  const displayItems = selectedDate
    ? timelineItems.filter((i) => i.date === selectedDate)
    : timelineItems.filter((i) => i.date.startsWith(currentMonth));

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
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-20">
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
          <button
            onClick={refreshTexts}
            title="ui_text 시트 동기화"
            className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg"
          >
            ↻
          </button>

          {/* AI 생성 날짜 범위 */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-[11px] text-slate-400 hidden sm:inline">AI 생성 범위</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-sm focus:outline-none focus:border-blue-400"
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
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

      {/* ── 메인 (캘린더 + 카드) ── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── 왼쪽: 캘린더 (sticky) ── */}
          <div className="w-full lg:w-[260px] shrink-0 lg:sticky lg:top-[61px]">
            <CalendarView
              timelineItems={timelineItems}
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              selectedDate={selectedDate}
            />
          </div>

          {/* ── 오른쪽: 요약 + 카드 ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* 월/날짜 타이틀 & 배지 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-slate-800">
                  {selectedDate
                    ? `📅 ${selectedDate}`
                    : `${currentMonth.replace("-", "년 ")}월`}
                </h2>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {t("timeline.show_all", "← 월 전체 보기")}
                  </button>
                )}
              </div>
              <EventSummaryBar items={displayItems} />
            </div>

            {/* 카드 */}
            <TimelineCards
              items={displayItems}
              onDateClick={handleDayClick}
              emptyMessage={
                selectedDate
                  ? "이 날은 기록된 이벤트가 없습니다."
                  : t(
                      "timeline.no_items",
                      "이 달에 이벤트가 없습니다. AI 타임라인 생성 버튼을 눌러 분석을 시작하세요."
                    )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
