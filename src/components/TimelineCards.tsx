"use client";

import { useState } from "react";
import { TimelineItem, TimelineItemType, SourceLink } from "@/lib/types";

// ──────────────────────────────────────────
// 타입 설정
// ──────────────────────────────────────────
const TYPE_CONFIG: Record<TimelineItemType, { label: string; color: string }> = {
  official_patch:  { label: "패치노트",    color: "#3b82f6" },
  official_event:  { label: "공식 이벤트", color: "#10b981" },
  official_notice: { label: "공지사항",    color: "#f59e0b" },
  user_issue:      { label: "유저 이슈",   color: "#ef4444" },
  weekly_summary:  { label: "주간 동향",   color: "#8b5cf6" },
  event_reaction:  { label: "이벤트 반응", color: "#64748b" },
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  positive: { label: "긍정적", color: "#059669", bg: "#ecfdf5" },
  negative: { label: "부정적", color: "#dc2626", bg: "#fef2f2" },
  neutral:  { label: "중립",   color: "#64748b", bg: "#f1f5f9" },
  mixed:    { label: "복합적", color: "#d97706", bg: "#fffbeb" },
};

// ──────────────────────────────────────────
// 주차 계산 유틸
// ──────────────────────────────────────────
function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getSundayDate(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  const sunday = new Date(mondayStr + "T00:00:00");
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${fmt(d)} – ${fmt(sunday)}`;
}

// ──────────────────────────────────────────
// DC 게시글 목록 (접기/펼치기)
// ──────────────────────────────────────────
function DcSourceLinks({ links, defaultExpanded = false }: { links: SourceLink[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!links.length) return null;
  const shown = expanded ? links : links.slice(0, 3);
  return (
    <div className="mt-1.5 space-y-1">
      {shown.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex-1 min-w-0 truncate"
          >
            {link.title || `게시글 ${i + 1}`}
          </a>
          {(link.views || link.comments) && (
            <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
              {link.views ? `조회 ${link.views.toLocaleString()}` : ""}
              {link.comments ? ` · 댓글 ${link.comments}` : ""}
            </span>
          )}
        </div>
      ))}
      {links.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-slate-400 hover:text-slate-600"
        >
          {expanded ? "접기" : `+${links.length - 3}개 더 보기`}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// 공식 이벤트 행 (patch / event / notice)
// ──────────────────────────────────────────
function OfficialRow({ item }: { item: TimelineItem }) {
  const cfg = TYPE_CONFIG[item.type];
  const hasLinks = (item.sourceLinks?.length ?? 0) > 0;

  // detail을 bullet 배열로 파싱
  const bullets = item.detail
    ? item.detail
        .split("\n")
        .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
          style={{ backgroundColor: cfg.color + "18", color: cfg.color }}
        >
          {cfg.label}
        </span>
        <div className="flex-1 min-w-0">
          {/* 제목 + 날짜 */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800 leading-snug">{item.title}</p>
            <span className="text-[11px] text-slate-400 shrink-0">{item.date.slice(5)}</span>
          </div>

          {/* 한 줄 요약 */}
          {item.summary && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.summary}</p>
          )}

          {/* 주요 내용 bullet – 기본 표시 */}
          {bullets.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                  <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-slate-400" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* 데이터 없을 때 안내 */}
          {!item.summary && bullets.length === 0 && (
            <p className="text-xs text-slate-400 mt-1 italic">AI 요약 없음 — 재생성하면 표시됩니다</p>
          )}

          {/* 포럼 원문 링크 */}
          {hasLinks && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.sourceLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors border border-blue-100"
                >
                  🔗 {link.title ? link.title.slice(0, 35) : "원문 보기"}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 유저 동향 행 (user_issue / event_reaction)
// ──────────────────────────────────────────
function UserRow({ item }: { item: TimelineItem }) {
  const [linksOpen, setLinksOpen] = useState(false);
  const isIssue = item.type === "user_issue";
  const sentiment = item.dcSentiment ? SENTIMENT_CONFIG[item.dcSentiment] : null;

  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 w-1.5 h-1.5 rounded-full mt-2"
          style={{ backgroundColor: isIssue ? "#ef4444" : "#94a3b8" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-800 leading-snug">{item.title}</p>
            {sentiment && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ color: sentiment.color, backgroundColor: sentiment.bg }}
              >
                {sentiment.label}
              </span>
            )}
          </div>

          {item.summary && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.summary}</p>
          )}

          {/* DC 게시글 수 – 뱃지로 강조 */}
          {item.evidenceCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                DC 게시글 {item.evidenceCount}건
              </span>
              {item.evidenceMetrics?.avgViews && (
                <span className="text-[11px] text-slate-400">
                  평균 조회 {item.evidenceMetrics.avgViews.toLocaleString()}
                </span>
              )}
              {item.evidenceMetrics?.avgComments && (
                <span className="text-[11px] text-slate-400">
                  평균 댓글 {item.evidenceMetrics.avgComments}
                </span>
              )}
            </div>
          )}

          {/* 근거 DC 게시글 목록 */}
          {(item.sourceLinks?.length ?? 0) > 0 && (
            <>
              <button
                onClick={() => setLinksOpen(!linksOpen)}
                className="text-[11px] text-blue-400 hover:text-blue-600 mt-1"
              >
                {linksOpen ? "접기" : `근거 게시글 보기 (${item.sourceLinks.length})`}
              </button>
              {linksOpen && <DcSourceLinks links={item.sourceLinks} />}
            </>
          )}
        </div>
        <span className="text-[11px] text-slate-400 shrink-0">{item.date.slice(5)}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 주간 리포트 카드
// ──────────────────────────────────────────
type WeekGroup = {
  mondayKey: string;
  officialItems: TimelineItem[];
  userItems: TimelineItem[];
  weeklySummary: TimelineItem | null;
};

function WeeklyReportCard({ group }: { group: WeekGroup }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  const { mondayKey, officialItems, userItems, weeklySummary } = group;
  const sundayKey = getSundayDate(mondayKey);

  const sentiment = weeklySummary?.dcSentiment
    ?? userItems.find((i) => i.dcSentiment)?.dcSentiment
    ?? null;
  const sentimentCfg = sentiment ? SENTIMENT_CONFIG[sentiment] : null;

  const hasOfficial = officialItems.length > 0;
  const hasUser = userItems.length > 0;

  // 이 주의 DC 게시글 총합
  const weekDcTotal = userItems.reduce((sum, i) => sum + (i.evidenceCount || 0), 0)
    + (weeklySummary?.evidenceCount || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* 주차 헤더 */}
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs text-slate-400 font-mono">{mondayKey} – {sundayKey}</p>
            <p className="font-semibold text-slate-800 mt-0.5">{formatWeekLabel(mondayKey)}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {sentimentCfg && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ color: sentimentCfg.color, backgroundColor: sentimentCfg.bg }}
              >
                {sentimentCfg.label}
              </span>
            )}
            {hasOfficial && (
              <span className="text-[11px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">
                공식 {officialItems.length}건
              </span>
            )}
            {hasUser && (
              <span className="text-[11px] bg-red-50 text-red-400 px-2 py-0.5 rounded-full">
                유저 {userItems.length}건
              </span>
            )}
            {weekDcTotal > 0 && (
              <span className="text-[11px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-medium">
                DC {weekDcTotal}건
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* 공식 업데이트 */}
        {hasOfficial && (
          <section>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              📋 공식 업데이트
            </p>
            <div>
              {officialItems.map((item) => (
                <OfficialRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* 유저 동향 */}
        {hasUser && (
          <section>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              💬 유저 동향
            </p>
            <div>
              {userItems.map((item) => (
                <UserRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* AI 주간 요약 */}
        {weeklySummary && (
          <section className="border-t border-slate-100 pt-3">
            <button
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <p className="text-[11px] font-semibold text-violet-500 uppercase tracking-wide">
                ✦ AI 주간 요약
              </p>
              <span className="text-xs text-slate-400">{summaryOpen ? "▲ 접기" : "▼ 펼치기"}</span>
            </button>
            {!summaryOpen && weeklySummary.summary && (
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                {weeklySummary.summary}
              </p>
            )}
            {summaryOpen && (
              <div className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-violet-50 rounded-lg p-3">
                {weeklySummary.detail || weeklySummary.summary}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 단일 날짜 카드
// ──────────────────────────────────────────
function SingleDateCards({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const cfg = TYPE_CONFIG[item.type];
        const sentiment = item.dcSentiment ? SENTIMENT_CONFIG[item.dcSentiment] : null;
        const isOfficial = item.type === "official_patch" || item.type === "official_event" || item.type === "official_notice";
        const bullets = isOfficial && item.detail
          ? item.detail.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
          : [];
        return (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cfg.color + "18", color: cfg.color }}
              >
                {cfg.label}
              </span>
              {sentiment && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ color: sentiment.color, backgroundColor: sentiment.bg }}
                >
                  {sentiment.label}
                </span>
              )}
              <span className="text-slate-400 text-xs">{item.date}</span>
              {item.evidenceCount > 0 && (
                <span className="ml-auto text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  DC {item.evidenceCount}건
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 leading-snug">{item.title}</h3>
            {item.summary && (
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">{item.summary}</p>
            )}
            {/* 공식 포스트: 주요 내용 bullet 표시 */}
            {bullets.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-slate-400" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {isOfficial && !item.summary && bullets.length === 0 && (
              <p className="text-xs text-slate-400 mt-1 italic">AI 요약 없음 — 재생성하면 표시됩니다</p>
            )}
            {(item.sourceLinks?.length ?? 0) > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500 font-semibold mb-1.5">
                  {isOfficial ? "📎 포럼 원문" : "📌 근거 DC 게시글"}
                </p>
                <DcSourceLinks links={item.sourceLinks} defaultExpanded={isOfficial} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────
type Props = {
  items: TimelineItem[];
  emptyMessage?: string;
  onDateClick?: (date: string) => void;
};

export default function TimelineCards({ items, emptyMessage, onDateClick }: Props) {
  const [sortDesc, setSortDesc] = useState(true);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        {emptyMessage || "표시할 이벤트가 없습니다."}
      </div>
    );
  }

  const uniqueDates = Array.from(new Set(items.map((i) => i.date)));
  const isSingleDayView = uniqueDates.length === 1;
  if (isSingleDayView) {
    return <SingleDateCards items={items} />;
  }

  // 주간 그룹화
  const weekMap = new Map<string, WeekGroup>();
  for (const item of items) {
    const key = getMondayKey(item.date);
    if (!weekMap.has(key)) {
      weekMap.set(key, { mondayKey: key, officialItems: [], userItems: [], weeklySummary: null });
    }
    const grp = weekMap.get(key)!;
    if (item.type === "weekly_summary") {
      grp.weeklySummary = item;
    } else if (item.type === "official_patch" || item.type === "official_event" || item.type === "official_notice") {
      grp.officialItems.push(item);
    } else {
      grp.userItems.push(item);
    }
  }

  const weeks = Array.from(weekMap.values()).sort((a, b) =>
    sortDesc ? b.mondayKey.localeCompare(a.mondayKey) : a.mondayKey.localeCompare(b.mondayKey)
  );
  weeks.forEach((w) => {
    w.officialItems.sort((a, b) => a.date.localeCompare(b.date));
    w.userItems.sort((a, b) => a.date.localeCompare(b.date));
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          {sortDesc ? "↓ 최신순" : "↑ 오래된순"}
        </button>
      </div>
      <div className="space-y-4">
        {weeks.map((group) => (
          <WeeklyReportCard key={group.mondayKey} group={group} />
        ))}
      </div>
    </div>
  );
}
