"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameConfig, TimelineItem, ChartDataPoint } from "@/lib/types";
import TimelineChart from "@/components/TimelineChart";
import TimelineCards from "@/components/TimelineCards";
import MetricsUpload from "@/components/MetricsUpload";
import AiGenerateButton from "@/components/AiGenerateButton";

export default function GameTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<GameConfig | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Date range state (default: last 3 months)
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  const [fromDate, setFromDate] = useState(threeMonthsAgo.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gameRes, timelineRes, metricsRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/timeline/${gameId}`),
        fetch(`/api/metrics/${gameId}?from=${fromDate}&to=${toDate}`),
      ]);

      if (gameRes.ok) {
        const { game } = await gameRes.json();
        setGame(game);
      }

      if (timelineRes.ok) {
        const { items } = await timelineRes.json();
        setTimelineItems(items || []);
      }

      if (metricsRes.ok) {
        const { metrics } = await metricsRes.json();
        const points: ChartDataPoint[] = metrics.map(
          (m: { date: string; data: Record<string, number> }) => ({
            date: m.date,
            ...m.data,
          })
        );
        setChartData(points);
      }
    } finally {
      setLoading(false);
    }
  }, [gameId, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = selectedDate
    ? timelineItems.filter((item) => item.date === selectedDate)
    : timelineItems.filter(
        (item) => item.date >= fromDate && item.date <= toDate
      );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-[#94a3b8]">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <header className="border-b border-[#2d3748] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[#94a3b8] hover:text-white transition-colors"
        >
          ← 목록
        </button>
        <h1 className="text-xl font-bold">{game?.name || "게임"} 타임라인</h1>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {/* Date range picker */}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#3b82f6]"
            />
            <span className="text-[#94a3b8]">~</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          {game && (
            <AiGenerateButton
              gameId={game.id}
              fromDate={fromDate}
              toDate={toDate}
              onSuccess={loadData}
            />
          )}

          <button
            onClick={() => setShowUpload(!showUpload)}
            className="border border-[#2d3748] hover:border-[#3b82f6] text-[#94a3b8] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            📊 지표 업로드
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Metrics upload panel */}
        {showUpload && game && (
          <MetricsUpload
            gameId={game.id}
            onSuccess={() => {
              setShowUpload(false);
              loadData();
            }}
          />
        )}

        {/* Timeline Chart */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-[#94a3b8]">지표 + 이벤트 타임라인</h2>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-[#3b82f6] hover:underline"
              >
                전체 보기
              </button>
            )}
          </div>
          <TimelineChart
            chartData={chartData}
            timelineItems={timelineItems.filter(
              (item) => item.date >= fromDate && item.date <= toDate
            )}
            metricColumns={game?.metric_columns || []}
            onDateClick={(date) =>
              setSelectedDate((prev) => (prev === date ? null : date))
            }
            selectedDate={selectedDate}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-[#94a3b8]">
          {[
            { type: "official_patch", label: "패치노트", color: "#3b82f6" },
            { type: "official_event", label: "공식 이벤트", color: "#10b981" },
            { type: "official_notice", label: "공지사항", color: "#f59e0b" },
            { type: "user_issue", label: "유저 이슈", color: "#ef4444" },
            { type: "weekly_summary", label: "주간 동향", color: "#8b5cf6" },
            { type: "event_reaction", label: "이벤트 반응", color: "#64748b" },
          ].map(({ type, label, color }) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* Timeline Cards */}
        <div>
          <h2 className="font-semibold mb-4">
            {selectedDate ? `${selectedDate} 이벤트` : "전체 이벤트"}
            <span className="text-[#94a3b8] text-sm font-normal ml-2">
              ({filteredItems.length}건)
            </span>
          </h2>
          <TimelineCards items={filteredItems} />
        </div>
      </main>
    </div>
  );
}
