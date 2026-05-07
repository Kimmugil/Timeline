"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameConfig, TimelineItem, TimelineItemType } from "@/lib/types";
import TimelineCards from "@/components/TimelineCards";
import CalendarView from "@/components/CalendarView";

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

  // DC 게시글 총합 (유저 동향 항목들의 evidenceCount 합산)
  const totalDcPosts = items.reduce((sum, i) => sum + (i.evidenceCount || 0), 0);

  if (badges.length === 0 && totalDcPosts === 0) return null;

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
      {totalDcPosts > 0 && (
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold"
          style={{ borderColor: "#6366f155", color: "#6366f1", backgroundColor: "#6366f112" }}>
          DC 게시글 {totalDcPosts}건 분석
        </span>
      )}
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
  const [game, setGame]               = useState<GameConfig | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 캘린더 현재 월 (기본: 이번 달)
  const todayStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [currentMonth, setCurrentMonth] = useState(todayStr);

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

  // 카드에 표시할 아이템:
  // - 날짜 선택 시: 해당 날짜
  // - 아니면: 현재 캘린더 월 전체
  const displayItems = selectedDate
    ? timelineItems.filter((i) => i.date === selectedDate)
    : timelineItems.filter((i) => i.date.startsWith(currentMonth));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">로딩 중...</p>
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
          ← 목록
        </button>

        <h1 className="text-lg font-bold text-slate-900">
          {game?.name || "게임"} 타임라인
        </h1>

        <div className="ml-auto">
          <button
            onClick={() => router.push("/admin")}
            className="text-slate-400 hover:text-slate-700 text-xs border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            🔑 관리자
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
                    ← 월 전체 보기
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
                  : "이 달에 이벤트가 없습니다. AI 타임라인 생성 버튼을 눌러 분석을 시작하세요."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
