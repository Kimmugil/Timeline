"use client";

import { TimelineItem, TimelineItemType } from "@/lib/types";

const TYPE_COLORS: Record<TimelineItemType, string> = {
  official_patch:  "#3b82f6",
  official_event:  "#059669",
  official_notice: "#d97706",
  user_issue:      "#dc2626",
  weekly_summary:  "#7c3aed",
  event_reaction:  "#6B7280",
};

const LEGEND = [
  { label: "패치/이벤트/공지", color: "#3b82f6" },
  { label: "유저 이슈",        color: "#dc2626" },
  { label: "주간 요약",        color: "#7c3aed" },
];

type Props = {
  timelineItems: TimelineItem[];
  currentMonth: string;
  onMonthChange: (m: string) => void;
  onDayClick: (date: string) => void;
  selectedDate: string | null;
};

const DOW = ["월", "화", "수", "목", "금", "토", "일"];

export default function CalendarView({
  timelineItems, currentMonth, onMonthChange, onDayClick, selectedDate,
}: Props) {
  const [yearStr, monthStr] = currentMonth.split("-");
  const year  = Number(yearStr);
  const month = Number(monthStr);

  const eventsByDate: Record<string, TimelineItemType[]> = {};
  for (const item of timelineItems) {
    if (!eventsByDate[item.date]) eventsByDate[item.date] = [];
    eventsByDate[item.date].push(item.type);
  }

  const monthPrefix = currentMonth;
  const eventCountInMonth = Object.entries(eventsByDate)
    .filter(([d]) => d.startsWith(monthPrefix))
    .reduce((sum, [, types]) => sum + types.length, 0);

  const firstDow    = new Date(year, month - 1, 1).getDay();
  const offset      = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date().toISOString().slice(0, 10);

  function navMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function dateStr(day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function dotColors(date: string): string[] {
    const types = eventsByDate[date] || [];
    const colors: string[] = [];
    for (const t of types) {
      const c = (t === "official_patch" || t === "official_event" || t === "official_notice")
        ? "#3b82f6" : TYPE_COLORS[t];
      if (!colors.includes(c) && colors.length < 3) colors.push(c);
    }
    return colors;
  }

  return (
    <div className="neo-card overflow-hidden">
      {/* 월 헤더 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "2px solid #1A1A1A" }}>
        <button
          onClick={() => navMonth(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg font-black text-lg transition-colors hover:bg-[#F0EFEC]"
          style={{ color: "var(--text)" }}
        >
          ‹
        </button>
        <div className="text-center">
          <p className="font-black text-sm" style={{ color: "var(--text)" }}>
            {year}년 {month}월
          </p>
          {eventCountInMonth > 0 && (
            <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
              이벤트 {eventCountInMonth}건
            </p>
          )}
        </div>
        <button
          onClick={() => navMonth(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg font-black text-lg transition-colors hover:bg-[#F0EFEC]"
          style={{ color: "var(--text)" }}
        >
          ›
        </button>
      </div>

      <div className="p-3">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d, i) => (
            <div
              key={d}
              className="text-center text-[10px] font-black py-1"
              style={{ color: i === 5 ? "#3b82f6" : i === 6 ? "#dc2626" : "var(--text-muted)" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;

            const date   = dateStr(day);
            const dots   = dotColors(date);
            const hasEvt = dots.length > 0;
            const isSel  = selectedDate === date;
            const isTod  = today === date;
            const dow    = (offset + day - 1) % 7;

            return (
              <button
                key={date}
                onClick={() => hasEvt && onDayClick(date)}
                disabled={!hasEvt}
                className="relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-all"
                style={{
                  background: isSel ? "#1A1A1A" : "transparent",
                  outline: isTod && !isSel ? "2px solid #FFD600" : "none",
                  outlineOffset: "-2px",
                  opacity: !hasEvt ? 0.35 : 1,
                  cursor: hasEvt ? "pointer" : "default",
                }}
              >
                <span
                  className="text-xs leading-none font-bold"
                  style={{
                    color: isSel ? "#FFD600"
                      : isTod ? "#1A1A1A"
                      : dow === 5 ? "#3b82f6"
                      : dow === 6 ? "#dc2626"
                      : "var(--text)",
                    fontWeight: isTod ? 900 : 700,
                  }}
                >
                  {day}
                </span>
                {dots.length > 0 && (
                  <div className="flex gap-px mt-0.5">
                    {dots.map((color, ci) => (
                      <span
                        key={ci}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: isSel ? "#FFD600" : color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="px-4 py-2.5 flex flex-wrap gap-3" style={{ borderTop: "2px solid #E2E8F0" }}>
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
