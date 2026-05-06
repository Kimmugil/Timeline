import { GoogleGenerativeAI } from "@google/generative-ai";
import { ForumPost, DcPost, TimelineItem } from "./types";
import {
  format,
  parseISO,
  eachWeekOfInterval,
  endOfWeek,
  addDays,
  subDays,
} from "date-fns";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function getModel() {
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

function byEngagement(a: DcPost, b: DcPost) {
  return b.views + b.comments * 5 + b.likes * 3 - (a.views + a.comments * 5 + a.likes * 3);
}

function formatDcPosts(posts: DcPost[], max = 40): string {
  return [...posts]
    .sort(byEngagement)
    .slice(0, max)
    .map(
      (p) =>
        `[조회:${p.views}/댓글:${p.comments}/추천:${p.likes}] ${p.date} - ${p.title}\n${p.body.slice(0, 200)}\n링크: ${p.link}`
    )
    .join("\n\n---\n\n");
}

function formatForumPosts(posts: ForumPost[]): string {
  const typeLabel = { patch: "패치노트", event: "이벤트", notice: "공지" };
  return posts
    .map(
      (p) =>
        `[${typeLabel[p.type]}] ${p.date} - ${p.title}\n${p.body.slice(0, 300)}\n링크: ${p.link}`
    )
    .join("\n\n---\n\n");
}

async function callGemini(prompt: string): Promise<unknown> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON in Gemini response");
  return JSON.parse(match[0]);
}

// 공식 이벤트 → 타임라인 아이템 (AI 불필요, 직접 변환)
export function forumPostsToTimelineItems(
  posts: ForumPost[],
  gameId: number
): TimelineItem[] {
  const byDateType: Record<string, ForumPost[]> = {};
  for (const post of posts) {
    const key = `${post.date}__${post.type}`;
    if (!byDateType[key]) byDateType[key] = [];
    byDateType[key].push(post);
  }

  const typeMap = {
    patch: "official_patch",
    event: "official_event",
    notice: "official_notice",
  } as const;

  return Object.entries(byDateType).map(([key, datePosts]) => {
    const [date, rawType] = key.split("__");
    const type = typeMap[rawType as keyof typeof typeMap];
    const titles = datePosts.map((p) => p.title);
    const label = { patch: "패치노트", event: "이벤트", notice: "공지" }[rawType];

    return {
      id: `forum-${date}-${rawType}`,
      gameId,
      date,
      type,
      title:
        datePosts.length === 1
          ? datePosts[0].title
          : `${datePosts.length}개 ${label}`,
      summary:
        titles.slice(0, 3).join(", ") +
        (titles.length > 3 ? ` 외 ${titles.length - 3}개` : ""),
      detail: datePosts
        .map((p) => `• ${p.title}\n${p.body.slice(0, 500)}`)
        .join("\n\n"),
      sourceLinks: datePosts.map((p) => p.link).filter(Boolean),
      evidenceCount: 0,
      evidenceMetrics: null,
      relatedEventDate: null,
      dcSentiment: null,
      createdAt: new Date().toISOString(),
    };
  });
}

// 주간 DC 동향 요약
export async function analyzeWeeklySummary(
  gameName: string,
  weekStart: string,
  weekEnd: string,
  dcPosts: DcPost[],
  officialEvents: ForumPost[],
  gameId: number
): Promise<TimelineItem | null> {
  if (dcPosts.length < 5) return null;

  const prompt = `당신은 게임 커뮤니티 분석가입니다.
아래는 ${gameName} DC 갤러리 ${weekStart} ~ ${weekEnd} 기간 주요 게시글입니다.

[이 기간 공식 이벤트/공지]
${officialEvents.length > 0 ? formatForumPosts(officialEvents) : "없음"}

[DC 갤러리 주요 게시글]
${formatDcPosts(dcPosts, 40)}

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "summary": "이 기간 유저 동향 요약 (200자 이내)",
  "main_topics": [{"topic": "토픽", "post_count": 숫자, "sentiment": "positive/negative/neutral"}],
  "official_event_reactions": [{"event_title": "이벤트명", "reaction": "반응 100자 이내", "confidence": "confirmed/estimated"}],
  "overall_sentiment": "positive/negative/neutral/mixed"
}

주의:
- DC에서 직접 언급 시 confidence:"confirmed", 시점 유사성만 있으면 confidence:"estimated"
- 근거 없는 추측 금지, official_event_reactions는 DC에서 실제 언급된 경우만`;

  try {
    const parsed = (await callGemini(prompt)) as {
      summary: string;
      main_topics: { topic: string; post_count: number; sentiment: string }[];
      official_event_reactions: { event_title: string; reaction: string; confidence: string }[];
      overall_sentiment: string;
    };

    const topicLines = (parsed.main_topics || [])
      .map((t) => `• ${t.topic} (${t.post_count}건, ${t.sentiment})`)
      .join("\n");
    const reactionLines = (parsed.official_event_reactions || [])
      .map(
        (r) =>
          `• ${r.event_title}: ${r.reaction} [${r.confidence === "confirmed" ? "직접 언급 확인" : "추정"}]`
      )
      .join("\n");

    return {
      id: `weekly-${weekStart}`,
      gameId,
      date: weekStart,
      type: "weekly_summary",
      title: `${weekStart} ~ ${weekEnd} 주간 동향`,
      summary: parsed.summary || "",
      detail: [
        topicLines ? `**주요 토픽**\n${topicLines}` : "",
        reactionLines ? `**공식 이벤트 반응**\n${reactionLines}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      sourceLinks: [],
      evidenceCount: dcPosts.length,
      evidenceMetrics: { postCount: dcPosts.length },
      relatedEventDate: null,
      dcSentiment: (parsed.overall_sentiment || "neutral") as TimelineItem["dcSentiment"],
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Weekly summary error:", err);
    return null;
  }
}

// 공식 이벤트 날짜 전후 DC 반응 분석
export async function analyzeEventReaction(
  gameName: string,
  eventDate: string,
  events: ForumPost[],
  dcPosts: DcPost[],
  gameId: number
): Promise<TimelineItem | null> {
  if (dcPosts.length < 3 || events.length === 0) return null;

  const prompt = `당신은 게임 커뮤니티 분석가입니다.
${gameName}에서 ${eventDate}에 다음 공식 이벤트/공지가 발생했습니다.

[공식 이벤트/공지]
${formatForumPosts(events)}

아래는 이벤트 전후 3일간 DC 갤러리 주요 게시글입니다:

[DC 갤러리 게시글]
${formatDcPosts(dcPosts, 30)}

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "reaction_summary": "유저 반응 요약 (150자 이내)",
  "sentiment": "positive/negative/neutral/mixed",
  "key_mentions": ["키워드1", "키워드2"],
  "direct_mentions": true 또는 false,
  "confidence_note": "직접 언급 있음 OR 시점 유사성으로 추정"
}

주의:
- DC에서 이벤트를 직접 언급한 경우만 direct_mentions:true
- 직접 언급 없으면 "~하는 것으로 보임" 형태로만 표현
- 근거 없는 추측 금지`;

  try {
    const parsed = (await callGemini(prompt)) as {
      reaction_summary: string;
      sentiment: string;
      key_mentions: string[];
      direct_mentions: boolean;
      confidence_note: string;
    };

    return {
      id: `reaction-${eventDate}`,
      gameId,
      date: eventDate,
      type: "event_reaction",
      title: `${eventDate} 이벤트 유저 반응`,
      summary: parsed.reaction_summary || "",
      detail: `신뢰도: ${parsed.confidence_note || ""}\n키워드: ${(parsed.key_mentions || []).join(", ")}`,
      sourceLinks: [],
      evidenceCount: dcPosts.length,
      evidenceMetrics: {
        postCount: dcPosts.length,
        avgViews: Math.round(dcPosts.reduce((s, p) => s + p.views, 0) / dcPosts.length),
        avgComments: Math.round(dcPosts.reduce((s, p) => s + p.comments, 0) / dcPosts.length),
      },
      relatedEventDate: eventDate,
      dcSentiment: parsed.sentiment as TimelineItem["dcSentiment"],
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Event reaction error:", err);
    return null;
  }
}

// 유저 이슈 감지
export async function detectUserIssues(
  gameName: string,
  fromDate: string,
  toDate: string,
  dcPosts: DcPost[],
  gameId: number
): Promise<TimelineItem[]> {
  const highEngagement = dcPosts.filter(
    (p) => p.views >= 300 || p.comments >= 20 || p.likes >= 5
  );
  if (highEngagement.length < 3) return [];

  const prompt = `당신은 게임 커뮤니티 분석가입니다.
아래는 ${gameName} DC 갤러리 ${fromDate} ~ ${toDate} 기간 높은 참여도 게시글입니다.

[게시글 목록]
${formatDcPosts(highEngagement, 50)}

유저 이슈(의혹, 분쟁, 강한 불만 집중 등)가 감지되면 분석하세요.

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "issues": [
    {
      "title": "이슈 제목 (50자 이내)",
      "summary": "이슈 내용 (200자 이내)",
      "evidence_post_count": 숫자,
      "avg_views": 숫자,
      "avg_comments": 숫자,
      "source_links": ["링크1", "링크2"],
      "start_date": "YYYY-MM-DD"
    }
  ]
}

주의:
- 최소 3개 이상 게시글이 동일 이슈를 다루는 경우만 분류
- 단순 불만은 이슈 아님
- 감지된 이슈 없으면 issues:[]`;

  try {
    const parsed = (await callGemini(prompt)) as {
      issues: {
        title: string;
        summary: string;
        evidence_post_count: number;
        avg_views: number;
        avg_comments: number;
        source_links: string[];
        start_date: string;
      }[];
    };

    return (parsed.issues || []).map((issue) => ({
      id: `issue-${issue.start_date || fromDate}-${Math.random().toString(36).slice(2, 8)}`,
      gameId,
      date: issue.start_date || fromDate,
      type: "user_issue" as TimelineItem["type"],
      title: issue.title,
      summary: issue.summary,
      detail: `근거: 관련 게시글 ${issue.evidence_post_count}건, 평균 조회수 ${issue.avg_views}, 평균 댓글 ${issue.avg_comments}`,
      sourceLinks: issue.source_links || [],
      evidenceCount: issue.evidence_post_count || 0,
      evidenceMetrics: {
        postCount: issue.evidence_post_count,
        avgViews: issue.avg_views,
        avgComments: issue.avg_comments,
      },
      relatedEventDate: null,
      dcSentiment: "negative" as TimelineItem["dcSentiment"],
      createdAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Issue detection error:", err);
    return [];
  }
}

// 전체 AI 분석 오케스트레이션
export async function generateTimeline(
  game: {
    id: number;
    name: string;
    dc_raw_sheet_id: string;
    dc_sheet_tab: string;
    forum_raw_sheet_id: string;
  },
  fromDate: string,
  toDate: string,
  forumPosts: ForumPost[],
  dcPosts: DcPost[]
): Promise<TimelineItem[]> {
  const filteredForum = forumPosts.filter(
    (p) => p.date >= fromDate && p.date <= toDate
  );

  // 1. 공식 이벤트 → 직접 변환
  const officialItems = forumPostsToTimelineItems(filteredForum, game.id);

  // 2. 이벤트 날짜별 DC 반응 분석
  const eventDates = [...new Set(filteredForum.map((p) => p.date))];
  const reactionItems: TimelineItem[] = [];

  for (const eventDate of eventDates) {
    const eventsOnDate = filteredForum.filter((p) => p.date === eventDate);
    const from3 = format(subDays(parseISO(eventDate), 3), "yyyy-MM-dd");
    const to3 = format(addDays(parseISO(eventDate), 3), "yyyy-MM-dd");
    const nearbyDc = dcPosts.filter((p) => p.date >= from3 && p.date <= to3);

    const item = await analyzeEventReaction(
      game.name,
      eventDate,
      eventsOnDate,
      nearbyDc,
      game.id
    );
    if (item) reactionItems.push(item);
  }

  // 3. 주간 요약
  const weeklyItems: TimelineItem[] = [];
  if (dcPosts.length > 0) {
    const weeks = eachWeekOfInterval(
      { start: parseISO(fromDate), end: parseISO(toDate) },
      { weekStartsOn: 1 }
    );

    for (const weekStart of weeks) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const wStart = format(weekStart, "yyyy-MM-dd");
      const wEnd = format(weekEnd, "yyyy-MM-dd");

      const weekDc = dcPosts.filter((p) => p.date >= wStart && p.date <= wEnd);
      const weekForum = filteredForum.filter((p) => p.date >= wStart && p.date <= wEnd);

      const item = await analyzeWeeklySummary(
        game.name,
        wStart,
        wEnd,
        weekDc,
        weekForum,
        game.id
      );
      if (item) weeklyItems.push(item);
    }
  }

  // 4. 유저 이슈 감지
  const issueItems = await detectUserIssues(
    game.name,
    fromDate,
    toDate,
    dcPosts,
    game.id
  );

  return [...officialItems, ...reactionItems, ...weeklyItems, ...issueItems].sort(
    (a, b) => a.date.localeCompare(b.date)
  );
}
