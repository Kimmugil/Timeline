"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameConfig, TimelineItem, TimelineItemType } from "@/lib/types";
import TimelineCards from "@/components/TimelineCards";
import CalendarView from "@/components/CalendarView";

const BADGE_CONFIG: { type: TimelineItemType; label: string; color: string }[] = [
  { type: "official_patch",  label: "패치노트",    color: "bg-blue-50 text-blue-700 border-blue-200" },
  { type: "official_event",  label: "공식 이벤트", color: "bg-green-50 text-green-700 border-green-200" },
  { type: "official_notice", label: "공지사항",    color: "bg-amber-50 text-amber-700 border-amber-200" },
  { type: "user_issue",      label: "유저 이슈",   color: "bg-red-50 text-red-600 border-red-200" },
  { type: "event_reaction",  label: "이벤트 반응", color: "bg-gray-100 text-gray-600 border-gray-200" },
];

function EventSummaryBar({ items }: { items: TimelineItem[] }) {
  const badges = BADGE_CONFIG.map((cfg) => ({
    ...cfg,
    count: items.filter((i) => i.type === cfg.type).length,
  })).filter((b) => b.count > 0);

  const totalDcPosts = items.reduce((sum, i) => sum + (i.evidenceCount || 0), 0);
  if (badges.length === 0 && totalDcPosts === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {badges.map((b) => (
        <span key={b.type}
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${b.color}`}>
          <span className="font-semibold">{b.count}</span>{b.label}
        </span>
      ))}
      {totalDcPosts > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 font-medium">
          DC {totalDcPosts}건 분석
        </span>
      )}
      <span className="text-xs text-gray-400">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-gray-900 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white transition-colors text-xs"
          >
            ← 목록
          </button>
          <span className="border-l border-gray-700 pl-3 text-sm font-semibold text-white">
            {game?.name || "게임"} 타임라인
          </span>
          <div className="ml-auto">
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-gray-800"
            >
              🔑 관리자
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* 캘린더 */}
          <div className="w-full lg:w-[256px] shrink-0 lg:sticky lg:top-[49px]">
            <CalendarView
              timelineItems={timelineItems}
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              selectedDate={selectedDate}
            />
          </div>

          {/* 카드 영역 */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-gray-900">
                  {selectedDate ? `📅 ${selectedDate}` : `${currentMonth.replace("-", "년 ")}월`}
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
