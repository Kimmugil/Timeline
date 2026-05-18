"use client";

import { useState } from "react";
import { TimelineItem, TimelineItemType, SourceLink } from "@/lib/types";

const TYPE_CONFIG: Record<TimelineItemType, { label: string; cls: string }> = {
  official_patch:  { label: "패치노트",    cls: "bg-blue-50 text-blue-700 border-blue-200" },
  official_event:  { label: "공식 이벤트", cls: "bg-green-50 text-green-700 border-green-200" },
  official_notice: { label: "공지사항",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  user_issue:      { label: "유저 이슈",   cls: "bg-red-50 text-red-600 border-red-200" },
  weekly_summary:  { label: "주간 동향",   cls: "bg-purple-50 text-purple-700 border-purple-200" },
  event_reaction:  { label: "이벤트 반응", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

const SENTIMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  positive: { label: "긍정적", cls: "bg-green-50 text-green-700 border-green-200" },
  negative: { label: "부정적", cls: "bg-red-50 text-red-600 border-red-200" },
  neutral:  { label: "중립",   cls: "bg-gray-100 text-gray-600 border-gray-200" },
  mixed:    { label: "복합적", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
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

function DcSourceLinks({ links, defaultExpanded = false }: { links: SourceLink[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!links.length) return null;
  const shown = expanded ? links : links.slice(0, 3);
  return (
    <div className="mt-1.5 space-y-1">
      {shown.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <a href={link.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex-1 min-w-0 truncate">
            {link.title || `게시글 ${i + 1}`}
          </a>
          {(link.views || link.comments) && (
            <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
              {link.views ? `조회 ${link.views.toLocaleString()}` : ""}
              {link.comments ? ` · 댓글 ${link.comments}` : ""}
            </span>
          )}
        </div>
      ))}
      {links.length > 3 && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-gray-400 hover:text-gray-600">
          {expanded ? "접기" : `+${links.length - 3}개 더 보기`}
        </button>
      )}
    </div>
  );
}

function OfficialRow({ item }: { item: TimelineItem }) {
  const cfg = TYPE_CONFIG[item.type];
  const bullets = item.detail
    ? item.detail.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
    : [];

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-2">
        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border mt-0.5 ${cfg.cls}`}>
          {cfg.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800 leading-snug">{item.title}</p>
            <span className="text-[11px] text-gray-400 shrink-0">
              {item.date.slice(5)}{item.time ? ` ${item.time}` : ""}
            </span>
          </div>
          {item.summary && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.summary}</p>
          )}
          {bullets.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-gray-400" />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {!item.summary && bullets.length === 0 && (
            <p className="text-xs text-gray-400 mt-1 italic">AI 요약 없음 — 재생성하면 표시됩니다</p>
          )}
          {(item.sourceLinks?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.sourceLinks.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 transition-colors">
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

function UserRow({ item }: { item: TimelineItem }) {
  const [linksOpen, setLinksOpen] = useState(false);
  const isIssue = item.type === "user_issue";
  const sentiment = item.dcSentiment ? SENTIMENT_CONFIG[item.dcSentiment] : null;

  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-2">
        <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${isIssue ? "bg-red-400" : "bg-gray-300"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800 leading-snug">{item.title}</p>
            {sentiment && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sentiment.cls}`}>
                {sentiment.label}
              </span>
            )}
          </div>
          {item.summary && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.summary}</p>
          )}
          {item.evidenceCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                DC 게시글 {item.evidenceCount}건
              </span>
              {item.evidenceMetrics?.totalPostCount != null && (
                <span className="text-[11px] text-gray-400">
                  기간 총 {item.evidenceMetrics.totalPostCount}건
                </span>
              )}
              {item.evidenceMetrics?.avgViews && (
                <span className="text-[11px] text-gray-400">평균 조회 {item.evidenceMetrics.avgViews.toLocaleString()}</span>
              )}
              {item.evidenceMetrics?.avgComments && (
                <span className="text-[11px] text-gray-400">평균 댓글 {item.evidenceMetrics.avgComments}</span>
              )}
            </div>
          )}
          {(item.sourceLinks?.length ?? 0) > 0 && (
            <>
              <button onClick={() => setLinksOpen(!linksOpen)}
                className="text-[11px] text-blue-400 hover:text-blue-600 mt-1">
                {linksOpen ? "접기" : `근거 게시글 보기 (${item.sourceLinks.length})`}
              </button>
              {linksOpen && <DcSourceLinks links={item.sourceLinks} />}
            </>
          )}
        </div>
        <span className="text-[11px] text-gray-400 shrink-0">{item.date.slice(5)}</span>
      </div>
    </div>
  );
}

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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 주차 헤더 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] text-gray-400 font-mono">{mondayKey} – {sundayKey}</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatWeekLabel(mondayKey)}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {sentimentCfg && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sentimentCfg.cls}`}>
                {sentimentCfg.label}
              </span>
            )}
            {hasOfficial && (
              <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                공식 {officialItems.length}건
              </span>
            )}
            {hasUser && (
              <span className="text-[11px] bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">
                유저 {userItems.length}건
              </span>
            )}
            {weekDcTotal > 0 && (
              <span className="text-[11px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                DC {weekDcTotal}건
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {hasOfficial && (
          <section>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">📋 공식 업데이트</p>
            <div>
              {officialItems.map((item) => <OfficialRow key={item.id} item={item} />)}
            </div>
          </section>
        )}
        {hasUser && (
          <section>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">💬 유저 동향</p>
            <div>
              {userItems.map((item) => <UserRow key={item.id} item={item} />)}
            </div>
          </section>
        )}
        {weeklySummary && (
          <section className="border-t border-gray-100 pt-2.5">
            <button onClick={() => setSummaryOpen(!summaryOpen)}
              className="flex items-center justify-between w-full text-left">
              <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide">✦ AI 주간 요약</p>
              <span className="text-xs text-gray-400">{summaryOpen ? "▲" : "▼"}</span>
            </button>
            {!summaryOpen && weeklySummary.summary && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{weeklySummary.summary}</p>
            )}
            {summaryOpen && (
              <div className="mt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-purple-50 border border-purple-100 rounded-lg p-3">
                {weeklySummary.detail || weeklySummary.summary}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function SingleDateCards({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const cfg = TYPE_CONFIG[item.type];
        const sentiment = item.dcSentiment ? SENTIMENT_CONFIG[item.dcSentiment] : null;
        const isOfficial = ["official_patch","official_event","official_notice"].includes(item.type);
        const bullets = isOfficial && item.detail
          ? item.detail.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
          : [];

        return (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
              {sentiment && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sentiment.cls}`}>{sentiment.label}</span>
              )}
              <span className="text-xs text-gray-400">{item.date}{item.time ? ` ${item.time}` : ""}</span>
              {item.evidenceCount > 0 && (
                <span className="ml-auto text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  DC {item.evidenceCount}건
                  {item.evidenceMetrics?.totalPostCount != null &&
                    ` / 총 ${item.evidenceMetrics.totalPostCount}건`}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</h3>
            {item.summary && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.summary}</p>
            )}
            {bullets.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-gray-400" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {isOfficial && !item.summary && bullets.length === 0 && (
              <p className="text-xs text-gray-400 mt-1 italic">AI 요약 없음 — 재생성하면 표시됩니다</p>
            )}
            {(item.sourceLinks?.length ?? 0) > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-[10px] text-gray-400 font-semibold mb-1.5">
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

type Props = {
  items: TimelineItem[];
  emptyMessage?: string;
  onDateClick?: (date: string) => void;
};

export default function TimelineCards({ items, emptyMessage }: Props) {
  const [sortDesc, setSortDesc] = useState(true);

  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
        <p className="text-gray-400 text-sm">{emptyMessage || "표시할 이벤트가 없습니다."}</p>
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
    else if (["official_patch","official_event","official_notice"].includes(item.type)) grp.officialItems.push(item);
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
      <div className="flex justify-end mb-3">
        <button onClick={() => setSortDesc(!sortDesc)}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
          {sortDesc ? "↓ 최신순" : "↑ 오래된순"}
        </button>
      </div>
      <div className="space-y-3">
        {weeks.map((group) => <WeeklyReportCard key={group.mondayKey} group={group} />)}
      </div>
    </div>
  );
}
