"use client";

import { useState } from "react";
import { TimelineItem, TimelineItemType } from "@/lib/types";

const TYPE_CONFIG: Record<TimelineItemType, { label: string; color: string; bg: string; border: string }> = {
  official_patch: { label: "패치노트", color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)" },
  official_event: { label: "공식 이벤트", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.3)" },
  official_notice: { label: "공지사항", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)" },
  user_issue: { label: "유저 이슈", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)" },
  weekly_summary: { label: "주간 동향", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.3)" },
  event_reaction: { label: "이벤트 반응", color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.3)" },
};

const SENTIMENT_BADGE: Record<string, { label: string; color: string }> = {
  positive: { label: "😊 긍정", color: "#10b981" },
  negative: { label: "😠 부정", color: "#ef4444" },
  neutral: { label: "😐 중립", color: "#94a3b8" },
  mixed: { label: "🤔 복합", color: "#f59e0b" },
};

function Card({ item }: { item: TimelineItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[item.type];
  const sentiment = item.dcSentiment ? SENTIMENT_BADGE[item.dcSentiment] : null;

  return (
    <div className="rounded-xl p-4 border transition-all" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cfg.color + "22", color: cfg.color }}>
            {cfg.label}
          </span>
          {sentiment && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ color: sentiment.color, backgroundColor: sentiment.color + "22" }}>
              {sentiment.label}
            </span>
          )}
          <span className="text-[#94a3b8] text-xs">{item.date}</span>
        </div>
        {item.evidenceCount > 0 && (
          <span className="text-xs text-[#94a3b8] shrink-0">게시글 {item.evidenceCount}건</span>
        )}
      </div>

      <h3 className="font-semibold text-white mt-2 leading-snug">{item.title}</h3>

      {item.summary && (
        <p className="text-[#94a3b8] text-sm mt-1.5 leading-relaxed">{item.summary}</p>
      )}

      {item.detail && (
        <div className="mt-3">
          {expanded && (
            <div className="text-sm text-[#94a3b8] whitespace-pre-wrap leading-relaxed border-t border-[#2d3748] pt-3">
              {item.detail}
            </div>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-[#3b82f6] hover:underline mt-2">
            {expanded ? "접기" : "자세히 보기"}
          </button>
        </div>
      )}

      {item.evidenceMetrics && (item.evidenceMetrics.avgViews || item.evidenceMetrics.avgComments) && (
        <div className="mt-3 flex gap-4 text-xs text-[#64748b]">
          {item.evidenceMetrics.avgViews && <span>평균 조회 {item.evidenceMetrics.avgViews.toLocaleString()}</span>}
          {item.evidenceMetrics.avgComments && <span>평균 댓글 {item.evidenceMetrics.avgComments}</span>}
        </div>
      )}

      {item.sourceLinks && item.sourceLinks.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-[#2d3748] pt-3">
          <p className="text-xs text-[#64748b] font-medium mb-1.5">근거 게시글</p>
          {item.sourceLinks.slice(0, 5).map((link, i) => (
            <div key={i} className="flex items-start gap-2">
              <a href={link.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#3b82f6] hover:underline leading-snug flex-1 min-w-0 line-clamp-2">
                {link.title || `원문 ${i + 1}`}
              </a>
              {(link.views || link.comments || link.likes) && (
                <span className="text-xs text-[#64748b] shrink-0 whitespace-nowrap">
                  {link.views ? `조회 ${link.views.toLocaleString()}` : ""}
                  {link.comments ? ` · 댓글 ${link.comments}` : ""}
                  {link.likes ? ` · 추천 ${link.likes}` : ""}
                </span>
              )}
            </div>
          ))}
          {item.sourceLinks.length > 5 && (
            <span className="text-xs text-[#64748b]">외 {item.sourceLinks.length - 5}개</span>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  items: TimelineItem[];
  emptyMessage?: string;
};

export default function TimelineCards({ items, emptyMessage }: Props) {
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = [...items].sort((a, b) =>
    sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  );

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-[#94a3b8] text-sm">
        {emptyMessage || "표시할 이벤트가 없습니다."}
      </div>
    );
  }

  const grouped = sorted.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="text-xs text-[#94a3b8] hover:text-white border border-[#2d3748] px-3 py-1.5 rounded-lg transition-colors"
        >
          {sortDesc ? "↓ 최신순" : "↑ 오래된순"}
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dateItems]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[#94a3b8] text-sm font-mono">{date}</span>
              <div className="flex-1 h-px bg-[#2d3748]" />
            </div>
            <div className="space-y-3 ml-2">
              {dateItems.map((item) => <Card key={item.id} item={item} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
