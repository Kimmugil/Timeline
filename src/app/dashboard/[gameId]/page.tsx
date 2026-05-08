"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameConfig, TimelineItem, TimelineItemType } from "@/lib/types";
import TimelineCards from "@/components/TimelineCards";
import CalendarView from "@/components/CalendarView";

const BADGE_CONFIG: { type: TimelineItemType; label: string; color: string; bg: string }[] = [
  { type: "official_patch",  label: "패치노트",    color: "#3b82f6", bg: "#eff6ff" },
  { type: "official_event",  label: "공식 이벤트", color: "#059669", bg: "#ecfdf5" },
  { type: "official_notice", label: "공지사항",    color: "#d97706", bg: "#fffbeb" },
  { type: "user_issue",      label: "유저 이슈",   color: "#dc2626", bg: "#fef2f2" },
  { type: "event_reaction",  label: "이벤트 반응", color: "#6B7280", bg: "#F3F4F6" },
];

function EventSummaryBar({ items }: { items: TimelineItem[] }) {
  const badges = BADGE_CONFIG.map((cfg) => ({
    ...cfg,
    count: items.filter((i) => i.type === cfg.type).length,
  })).filter((b) => b.count > 0);

  const totalDcPosts = items.reduce((sum, i) => sum + (i.evidenceCount || 0), 0);
  if (badges.length === 0 && totalDcPosts === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {badges.map((b) => (
        <span
          key={b.type}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-black"
          style={{ border: `2px solid ${b.color}`, color: b.color, background: b.bg }}
        >
          <span>{b.count}</span>{b.label}
        </span>
      ))}
      {totalDcPosts > 0 && (
        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-black"
          style={{ border: "2px solid #6366f1", color: "#6366f1", background: "#eef2ff" }}>
          DC {totalDcPosts}건 분석
        </span>
      )}
      <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        총 {items.filter((i) => i.type !== "weekly_summary").length}건
      </span>
    </div>
  );
}

export default function GameTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [game, setGame] = useState<GameConfig | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 7);
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
        if (items.length > 0) {
          const latest = [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
          setCurrentMonth(latest.date.slice(0, 7));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleDayClick(date: string) {
    setSelectedDate((prev) => (prev === date ? null : date));
    setCurrentMonth(date.slice(0, 7));
  }

  function handleMonthChange(month: string) {
    setCurrentMonth(month);
    setSelectedDate(null);
  }

  const displayItems = selectedDate
    ? timelineItems.filter((i) => i.date === selectedDate)
    : timelineItems.filter((i) => i.date.startsWith(currentMonth));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="neo-card px-8 py-6 flex items-center gap-3">
          <span className="text-xl animate-spin">⏳</span>
          <span className="font-bold" style={{ color: "var(--text-2)" }}>로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── 헤더 ── */}
      <header className="bg-white sticky top-0 z-20" style={{ borderBottom: "2px solid #1A1A1A" }}>
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push("/dashboard")}
            className="neo-btn px-3 py-1.5 text-xs"
            style={{ background: "var(--bg)" }}
          >
            ← 목록
          </button>
          <h1 className="text-base font-black" style={{ color: "var(--text)" }}>
            {game?.name || "게임"} 타임라인
          </h1>
          <div className="ml-auto">
            <button
              onClick={() => router.push("/admin")}
              className="neo-btn text-xs px-3 py-1.5"
              style={{ background: "var(--bg)" }}
            >
              🔑 관리자
            </button>
          </div>
        </div>
      </header>

      {/* ── 메인 ── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── 왼쪽: 캘린더 ── */}
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-black text-base" style={{ color: "var(--text)" }}>
                  {selectedDate
                    ? `📅 ${selectedDate}`
                    : `${currentMonth.replace("-", "년 ")}월`}
                </h2>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="neo-btn text-xs px-2.5 py-1"
                    style={{ background: "var(--bg)" }}
                  >
                    ← 월 전체 보기
                  </button>
                )}
              </div>
              <EventSummaryBar items={displayItems} />
            </div>

            <TimelineCards
              items={displayItems}
              onDateClick={handleDayClick}
              emptyMessage={
                selectedDate
                  ? "이 날은 기록된 이벤트가 없습니다."
                  : "이 달에 이벤트가 없습니다. 관리자 패널에서 AI 타임라인을 생성하세요."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
