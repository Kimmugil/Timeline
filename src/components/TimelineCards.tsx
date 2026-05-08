"use client";

import { useState } from "react";
import { TimelineItem, TimelineItemType, SourceLink } from "@/lib/types";

// ── 타입 설정 ──
const TYPE_CONFIG: Record<TimelineItemType, { label: string; color: string; bg: string }> = {
  official_patch:  { label: "패치노트",    color: "#3b82f6", bg: "#eff6ff" },
  official_event:  { label: "공식 이벤트", color: "#059669", bg: "#ecfdf5" },
  official_notice: { label: "공지사항",    color: "#d97706", bg: "#fffbeb" },
  user_issue:      { label: "유저 이슈",   color: "#dc2626", bg: "#fef2f2" },
  weekly_summary:  { label: "주간 동향",   color: "#7c3aed", bg: "#f5f3ff" },
  event_reaction:  { label: "이벤트 반응", color: "#6B7280", bg: "#F3F4F6" },
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  positive: { label: "긍정적", color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
  negative: { label: "부정적", color: "#991B1B", bg: "#FEE2E2", border: "#FCA5A5" },
  neutral:  { label: "중립",   color: "#4A4A4A", bg: "#F0EFEC", border: "#D1D5DB" },
  mixed:    { label: "복합적", color: "#854D0E", bg: "#FEF9C3", border: "#FDE047" },
};

// ── 주차 유틸 ──
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
  const sun = new Date(mondayStr + "T00:00:00");
  sun.setDate(sun.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${fmt(d)} – ${fmt(sun)}`;
}

// ── DC 게시글 목록 ──
function DcSourceLinks({ links, defaultExpanded = false }: { links: SourceLink[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!links.length) return null;
  const shown = expanded ? links : links.slice(0, 3);
  return (
    <div className="mt-2 space-y-1.5">
      {shown.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <a href={link.url} target="_blank" rel="noopener noreferrer"
            className="text-xs flex-1 min-w-0 truncate font-semibold hover:underline"
            style={{ color: "#3b82f6" }}>
            {link.title || `게시글 ${i + 1}`}
          </a>
          {(link.views || link.comments) && (
            <span className="text-[11px] shrink-0 whitespace-nowrap font-medium" style={{ color: "var(--text-muted)" }}>
              {link.views ? `조회 ${link.views.toLocaleString()}` : ""}
              {link.comments ? ` · 댓글 ${link.comments}` : ""}
            </span>
          )}
        </div>
      ))}
      {links.length > 3 && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-bold hover:underline"
          style={{ color: "var(--text-muted)" }}>
          {expanded ? "접기" : `+${links.length - 3}개 더 보기`}
        </button>
      )}
    </div>
  );
}

// ── 공식 이벤트 행 ──
function OfficialRow({ item }: { item: TimelineItem }) {
  const cfg = TYPE_CONFIG[item.type];
  const bullets = item.detail
    ? item.detail.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
    : [];

  return (
    <div className="py-3.5" style={{ borderBottom: "1.5px solid #F0EFEC" }}>
      <div className="flex items-start gap-2.5">
        <span
          className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full mt-0.5"
          style={{ background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}` }}
        >
          {cfg.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-black leading-snug" style={{ color: "var(--text)" }}>{item.title}</p>
            <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--text-muted)" }}>
              {item.date.slice(5)}{item.time ? ` ${item.time}` : ""}
            </span>
          </div>

          {item.summary && (
            <p className="text-xs mt-1 leading-relaxed font-medium" style={{ color: "var(--text-2)" }}>{item.summary}</p>
          )}

          {bullets.length > 0 && (
            <ul className="mt-2 space-y-1">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs font-medium" style={{ color: "var(--text-2)" }}>
                  <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full" style={{ background: cfg.color }} />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {!item.summary && bullets.length === 0 && (
            <p className="text-xs mt-1 italic font-medium" style={{ color: "var(--text-muted)" }}>AI 요약 없음 — 재생성하면 표시됩니다</p>
          )}

          {(item.sourceLinks?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.sourceLinks.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all hover:-translate-y-px"
                  style={{ background: "#eff6ff", color: "#3b82f6", border: "1.5px solid #3b82f6" }}>
                  🔗 {link.title ? link.title.slice(0, 30) : "원문 보기"}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 유저 동향 행 ──
function UserRow({ item }: { item: TimelineItem }) {
  const [linksOpen, setLinksOpen] = useState(false);
  const isIssue = item.type === "user_issue";
  const sentiment = item.dcSentiment ? SENTIMENT_CONFIG[item.dcSentiment] : null;
  const cfg = TYPE_CONFIG[item.type];

  return (
    <div className="py-3" style={{ borderBottom: "1.5px solid #F0EFEC" }}>
      <div className="flex items-start gap-2.5">
        <span
          className="shrink-0 w-2 h-2 rounded-full mt-2"
          style={{ background: cfg.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-black leading-snug" style={{ color: "var(--text)" }}>{item.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              {sentiment && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ color: sentiment.color, background: sentiment.bg, border: `1.5px solid ${sentiment.border}` }}>
                  {sentiment.label}
                </span>
              )}
              <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{item.date.slice(5)}</span>
            </div>
          </div>

          {item.summary && (
            <p className="text-xs mt-0.5 leading-relaxed font-medium" style={{ color: "var(--text-2)" }}>{item.summary}</p>
          )}

          {item.evidenceCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ color: "#6366f1", background: "#eef2ff", border: "1.5px solid #6366f1" }}>
                DC 게시글 {item.evidenceCount}건
              </span>
              {item.evidenceMetrics?.avgViews && (
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  평균 조회 {item.evidenceMetrics.avgViews.toLocaleString()}
                </span>
              )}
              {item.evidenceMetrics?.avgComments && (
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  평균 댓글 {item.evidenceMetrics.avgComments}
                </span>
              )}
            </div>
          )}

          {(item.sourceLinks?.length ?? 0) > 0 && (
            <>
              <button onClick={() => setLinksOpen(!linksOpen)}
                className="text-[11px] font-black mt-1.5 hover:underline"
                style={{ color: "#3b82f6" }}>
                {linksOpen ? "접기" : `근거 게시글 보기 (${item.sourceLinks.length})`}
              </button>
              {linksOpen && <DcSourceLinks links={item.sourceLinks} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 주간 리포트 카드 ──
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

  const sentiment = weeklySummary?.dcSentiment ?? userItems.find((i) => i.dcSentiment)?.dcSentiment ?? null;
  const sentimentCfg = sentiment ? SENTIMENT_CONFIG[sentiment] : null;
  const hasOfficial = officialItems.length > 0;
  const hasUser = userItems.length > 0;
  const weekDcTotal = userItems.reduce((sum, i) => sum + (i.evidenceCount || 0), 0)
    + (weeklySummary?.evidenceCount || 0);

  return (
    <div className="neo-card overflow-hidden">
      {/* 주차 헤더 */}
      <div className="px-5 py-4" style={{ borderBottom: "2px solid #1A1A1A", background: "#FAFAFA" }}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-black mb-0.5" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              {mondayKey} – {sundayKey}
            </p>
            <p className="font-black text-sm" style={{ color: "var(--text)" }}>{formatWeekLabel(mondayKey)}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {sentimentCfg && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full"
                style={{ color: sentimentCfg.color, background: sentimentCfg.bg, border: `1.5px solid ${sentimentCfg.border}` }}>
                {sentimentCfg.label}
              </span>
            )}
            {hasOfficial && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ color: "#3b82f6", background: "#eff6ff", border: "1.5px solid #3b82f6" }}>
                공식 {officialItems.length}건
              </span>
            )}
            {hasUser && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ color: "#dc2626", background: "#fef2f2", border: "1.5px solid #dc2626" }}>
                유저 {userItems.length}건
              </span>
            )}
            {weekDcTotal > 0 && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ color: "#6366f1", background: "#eef2ff", border: "1.5px solid #6366f1" }}>
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
            <p className="section-label mb-2">📋 공식 업데이트</p>
            <div className="[&>*:last-child]:border-0">
              {officialItems.map((item) => <OfficialRow key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {/* 유저 동향 */}
        {hasUser && (
          <section>
            <p className="section-label mb-2">💬 유저 동향</p>
            <div className="[&>*:last-child]:border-0">
              {userItems.map((item) => <UserRow key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {/* AI 주간 요약 */}
        {weeklySummary && (
          <section style={{ borderTop: "1.5px solid #F0EFEC", paddingTop: "12px" }}>
            <button onClick={() => setSummaryOpen(!summaryOpen)}
              className="flex items-center justify-between w-full text-left">
              <p className="section-label" style={{ color: "#7c3aed" }}>✦ AI 주간 요약</p>
              <span className="text-xs font-black" style={{ color: "var(--text-muted)" }}>
                {summaryOpen ? "▲ 접기" : "▼ 펼치기"}
              </span>
            </button>
            {!summaryOpen && weeklySummary.summary && (
              <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed font-medium" style={{ color: "var(--text-2)" }}>
                {weeklySummary.summary}
              </p>
            )}
            {summaryOpen && (
              <div className="mt-2 text-xs leading-relaxed whitespace-pre-wrap font-medium rounded-xl p-3"
                style={{ background: "#f5f3ff", border: "1.5px solid #7c3aed", color: "var(--text-2)" }}>
                {weeklySummary.detail || weeklySummary.summary}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ── 단일 날짜 카드 ──
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
          <div key={item.id} className="neo-card p-5">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}` }}>
                {cfg.label}
              </span>
              {sentiment && (
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full"
                  style={{ color: sentiment.color, background: sentiment.bg, border: `1.5px solid ${sentiment.border}` }}>
                  {sentiment.label}
                </span>
              )}
              <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                {item.date}{item.time ? ` ${item.time}` : ""}
              </span>
              {item.evidenceCount > 0 && (
                <span className="ml-auto text-[11px] font-black px-2 py-0.5 rounded-full"
                  style={{ color: "#6366f1", background: "#eef2ff", border: "1.5px solid #6366f1" }}>
                  DC {item.evidenceCount}건
                </span>
              )}
            </div>
            <h3 className="font-black text-sm leading-snug mb-1" style={{ color: "var(--text)" }}>{item.title}</h3>
            {item.summary && (
              <p className="text-xs leading-relaxed font-medium" style={{ color: "var(--text-2)" }}>{item.summary}</p>
            )}
            {bullets.length > 0 && (
              <ul className="mt-2 space-y-1">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs font-medium" style={{ color: "var(--text-2)" }}>
                    <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full" style={{ background: cfg.color }} />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {isOfficial && !item.summary && bullets.length === 0 && (
              <p className="text-xs mt-1 italic font-medium" style={{ color: "var(--text-muted)" }}>AI 요약 없음 — 재생성하면 표시됩니다</p>
            )}
            {(item.sourceLinks?.length ?? 0) > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: "1.5px solid #F0EFEC" }}>
                <p className="text-[11px] font-black mb-2" style={{ color: "var(--text-muted)" }}>
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

// ── 메인 컴포넌트 ──
type Props = {
  items: TimelineItem[];
  emptyMessage?: string;
  onDateClick?: (date: string) => void;
};

export default function TimelineCards({ items, emptyMessage }: Props) {
  const [sortDesc, setSortDesc] = useState(true);

  if (items.length === 0) {
    return (
      <div className="neo-card text-center py-16 px-6">
        <p className="text-3xl mb-3">📭</p>
        <p className="font-bold text-sm" style={{ color: "var(--text-2)" }}>
          {emptyMessage || "표시할 이벤트가 없습니다."}
        </p>
      </div>
    );
  }

  const uniqueDates = Array.from(new Set(items.map((i) => i.date)));
  if (uniqueDates.length === 1) return <SingleDateCards items={items} />;

  const weekMap = new Map<string, WeekGroup>();
  for (const item of items) {
    const key = getMondayKey(item.date);
    if (!weekMap.has(key)) weekMap.set(key, { mondayKey: key, officialItems: [], userItems: [], weeklySummary: null });
    const grp = weekMap.get(key)!;
    if (item.type === "weekly_summary") grp.weeklySummary = item;
    else if (item.type === "official_patch" || item.type === "official_event" || item.type === "official_notice") grp.officialItems.push(item);
    else grp.userItems.push(item);
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
        <button onClick={() => setSortDesc(!sortDesc)} className="neo-btn text-xs px-3 py-1.5"
          style={{ background: "var(--bg)" }}>
          {sortDesc ? "↓ 최신순" : "↑ 오래된순"}
        </button>
      </div>
      <div className="space-y-4">
        {weeks.map((group) => <WeeklyReportCard key={group.mondayKey} group={group} />)}
      </div>
    </div>
  );
}
