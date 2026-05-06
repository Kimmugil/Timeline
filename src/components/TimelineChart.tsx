"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { ChartDataPoint, TimelineItem, TimelineItemType } from "@/lib/types";

type Props = {
  chartData: ChartDataPoint[];
  timelineItems: TimelineItem[];
  metricColumns: string[];
  onDateClick: (date: string) => void;
  selectedDate: string | null;
};

const TYPE_COLORS: Record<TimelineItemType, string> = {
  official_patch: "#3b82f6",
  official_event: "#10b981",
  official_notice: "#f59e0b",
  user_issue: "#ef4444",
  weekly_summary: "#8b5cf6",
  event_reaction: "#64748b",
};

const LINE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function fmt(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

function CustomTooltip({
  active,
  payload,
  label,
  eventsByDate,
  onDateClick,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  eventsByDate: Record<string, TimelineItem[]>;
  onDateClick: (date: string) => void;
}) {
  if (!active || !payload?.length) return null;

  const events = label ? eventsByDate[label] || [] : [];

  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-3 text-sm max-w-xs shadow-xl">
      <p className="font-semibold text-white mb-2">{label}</p>

      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 text-[#94a3b8]">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-mono">{fmt(p.value)}</span>
        </div>
      ))}

      {events.length > 0 && (
        <div className="mt-3 border-t border-[#2d3748] pt-2 space-y-1">
          {events.slice(0, 3).map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-1.5 cursor-pointer hover:text-white transition-colors"
              onClick={() => label && onDateClick(label)}
            >
              <span
                className="w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: TYPE_COLORS[ev.type] }}
              />
              <span className="text-[#94a3b8] text-xs leading-snug">
                {ev.title.slice(0, 40)}
              </span>
            </div>
          ))}
          {events.length > 3 && (
            <p className="text-xs text-[#64748b]">외 {events.length - 3}건 →</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TimelineChart({
  chartData,
  timelineItems,
  metricColumns,
  onDateClick,
  selectedDate,
}: Props) {
  // 날짜별 이벤트 인덱스
  const eventsByDate = timelineItems.reduce<Record<string, TimelineItem[]>>(
    (acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    },
    {}
  );

  // 이벤트가 있는 날짜들 (reference lines)
  const eventDates = Object.keys(eventsByDate);

  // primary metric = 첫 번째 컬럼 (보통 dau)
  const primaryMetric = metricColumns[0];
  const secondaryMetric = metricColumns[1];
  const extraMetrics = metricColumns.slice(2);

  if (chartData.length === 0 && timelineItems.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#94a3b8] text-sm">
        지표 데이터가 없습니다. CSV를 업로드하거나 AI 타임라인을 생성하세요.
      </div>
    );
  }

  // 차트 데이터가 없어도 이벤트 마커는 표시
  const hasMetrics = chartData.length > 0 && metricColumns.length > 0;

  // 이벤트만 있을 때 더미 x축 데이터 생성
  const displayData = hasMetrics
    ? chartData
    : eventDates
        .sort()
        .map((date) => ({ date }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart
        data={displayData}
        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
        onClick={(state) => {
          if (state?.activeLabel) onDateClick(state.activeLabel);
        }}
        style={{ cursor: "pointer" }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickFormatter={(val: string) => val.slice(5)} // MM-DD
        />

        {hasMetrics && primaryMetric && (
          <YAxis
            yAxisId="left"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmt}
            width={60}
          />
        )}

        {hasMetrics && secondaryMetric && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmt}
            width={60}
          />
        )}

        <Tooltip
          content={
            <CustomTooltip
              eventsByDate={eventsByDate}
              onDateClick={onDateClick}
            />
          }
        />

        {hasMetrics && metricColumns.length > 0 && <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />}

        {/* 이벤트 전용 모드: 더미 Y축 */}
        {!hasMetrics && <YAxis yAxisId="events" hide domain={[0, 1]} />}

        {/* 이벤트 reference lines */}
        {eventDates.map((date) => {
          const events = eventsByDate[date];
          const dominantType = events[0]?.type || "official_notice";
          return (
            <ReferenceLine
              key={date}
              x={date}
              yAxisId={hasMetrics && primaryMetric ? "left" : "events"}
              stroke={TYPE_COLORS[dominantType]}
              strokeOpacity={selectedDate === date ? 1 : 0.4}
              strokeWidth={selectedDate === date ? 2 : 1}
              strokeDasharray={selectedDate === date ? undefined : "4 2"}
            />
          );
        })}

        {/* Primary metric: Line */}
        {hasMetrics && primaryMetric && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={primaryMetric}
            stroke={LINE_COLORS[0]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: LINE_COLORS[0] }}
          />
        )}

        {/* Secondary metric: Bar */}
        {hasMetrics && secondaryMetric && (
          <Bar
            yAxisId="right"
            dataKey={secondaryMetric}
            fill={LINE_COLORS[1]}
            opacity={0.6}
            radius={[2, 2, 0, 0]}
          />
        )}

        {/* Extra metrics: Lines */}
        {hasMetrics &&
          extraMetrics.map((col, i) => (
            <Line
              key={col}
              yAxisId="left"
              type="monotone"
              dataKey={col}
              stroke={LINE_COLORS[(i + 2) % LINE_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
            />
          ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
