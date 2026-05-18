import { GoogleGenerativeAI } from "@google/generative-ai";
import { ForumPost, DcPost, TimelineItem, SourceLink } from "./types";
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
  return (b.views + b.comments * 5 + b.likes * 3) - (a.views + a.comments * 5 + a.likes * 3);
}

function formatDcPosts(posts: DcPost[], max = 40): string {
  return [...posts]
    .sort(byEngagement)
    .slice(0, max)
    .map((p) =>
      `[조회:${p.views}/댓글:${p.comments}/추천:${p.likes}] ${p.date} - ${p.title}\n${p.body.slice(0, 200)}\n링크: ${p.link}`
    )
    .join("\n\n---\n\n");
}

function formatForumPosts(posts: ForumPost[]): string {
  const typeLabel = { patch: "패치노트", event: "이벤트", notice: "공지" };
  return posts
    .map((p) =>
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

// 공식 이벤트/패치/공지 AI 요약
export async function summarizeForumGroup(
  gameName: string,
  date: string,
  rawType: string,
  posts: ForumPost[],
  gameId: string
): Promise<TimelineItem> {
  const typeMap = {
    patch: "official_patch",
    event: "official_event",
    notice: "official_notice",
  } as const;
  const type = typeMap[rawType as keyof typeof typeMap];
  const label = { patch: "패치노트", event: "이벤트", notice: "공지" }[rawType] ?? rawType;

  const sourceLinks: SourceLink[] = posts
    .slice(0, 5)
    .filter((p) => p.link)
    .map((p) => ({ url: p.link, title: p.title, views: p.views, likes: p.likes }));

  const postText = posts
    .map((p) => `제목: ${p.title}\n내용: ${p.body.slice(0, 600)}`)
    .join("\n\n---\n\n");

  const prompt = `당신은 게임 공식 공지 분석가입니다.
아래는 ${gameName}의 ${date} ${label} 게시글입니다.

${postText}

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "title": "핵심 한 줄 제목 (30자 이내, ${label} 태그 제외하고 내용만)",
  "summary": "한 문장 요약 (60자 이내)",
  "key_points": ["핵심 변경/내용 1 (50자 이내)", "핵심 변경/내용 2", "..."]
}

[규칙]
- title: 가장 중요한 변경/이벤트를 압축한 핵심 한 줄. "${label}"이라는 단어 반복 금지
- key_points: 유저에게 중요한 내용만 bullet, 최대 5개
- 불필요한 홍보 문구 제거하고 핵심만`;

  try {
    const parsed = (await callGemini(prompt)) as {
      title: string;
      summary: string;
      key_points: string[];
    };

    const detail = (parsed.key_points || [])
      .map((p) => `• ${p}`)
      .join("\n");

    // 가장 이른 시간 추출 (공지 시점 표시용)
    const earliestTime = posts
      .map((p) => p.time)
      .filter(Boolean)
      .sort()[0] || undefined;

    return {
      id: `forum-${date}-${rawType}`,
      gameId,
      date,
      time: earliestTime,
      type,
      title: parsed.title || posts[0]?.title || label,
      summary: parsed.summary || "",
      detail,
      sourceLinks,
      evidenceCount: 0,
      evidenceMetrics: null,
      relatedEventDate: null,
      dcSentiment: null,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`Forum summarize error (${date} ${rawType}):`, err);
    const earliestTime = posts.map((p) => p.time).filter(Boolean).sort()[0] || undefined;
    // fallback: AI 실패 시 원본 그대로
    return {
      id: `forum-${date}-${rawType}`,
      gameId,
      date,
      time: earliestTime,
      type,
      title: posts.length === 1 ? posts[0].title : `${posts.length}개 ${label}`,
      summary: posts.map((p) => p.title).slice(0, 3).join(", "),
      detail: posts.map((p) => `• ${p.title}\n${p.body.slice(0, 300)}`).join("\n\n"),
      sourceLinks,
      evidenceCount: 0,
      evidenceMetrics: null,
      relatedEventDate: null,
      dcSentiment: null,
      createdAt: new Date().toISOString(),
    };
  }
}

// 주간 DC 동향 요약
export async function analyzeWeeklySummary(
  gameName: string,
  weekStart: string,
  weekEnd: string,
  dcPosts: DcPost[],
  officialEvents: ForumPost[],
  gameId: string
): Promise<TimelineItem | null> {
  if (dcPosts.length < 5) return null;

  const sortedPosts = [...dcPosts].sort(byEngagement).slice(0, 40);

  const prompt = `당신은 게임 커뮤니티 분석가입니다.
아래는 ${gameName} DC 갤러리 ${weekStart} ~ ${weekEnd} 기간 주요 게시글입니다.

[이 기간 공식 이벤트/공지]
${officialEvents.length > 0 ? formatForumPosts(officialEvents) : "없음"}

[DC 갤러리 주요 게시글]
${formatDcPosts(sortedPosts, 40)}

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "summary": "이 기간 유저 동향 요약 (200자 이내)",
  "main_topics": [{"topic": "토픽", "post_count": 숫자, "sentiment": "positive/negative/neutral"}],
  "official_event_reactions": [{"event_title": "이벤트명", "reaction": "반응 100자 이내", "confidence": "confirmed/estimated"}],
  "overall_sentiment": "positive/negative/neutral/mixed",
  "top_posts": [
    {"url": "게시글링크", "title": "게시글제목", "views": 조회수, "comments": 댓글수, "likes": 추천수}
  ]
}

[top_posts 규칙 - 반드시 준수]
- 반드시 위에 제공된 게시글 목록에 있는 URL과 제목만 사용 (URL 변형/생성 절대 금지)
- 이번 주 동향을 가장 잘 대표하는 게시글 1~5개만 선택
- 조회수 또는 댓글수가 높고, 주간 이슈를 직접 다루는 게시글 우선
- 제공되지 않은 URL은 절대 포함하지 말 것

[추가 규칙]
- DC에서 직접 언급 시 confidence:"confirmed", 시점 유사성만 있으면 "estimated"
- 근거 없는 추측 금지`;

  try {
    const parsed = (await callGemini(prompt)) as {
      summary: string;
      main_topics: { topic: string; post_count: number; sentiment: string }[];
      official_event_reactions: { event_title: string; reaction: string; confidence: string }[];
      overall_sentiment: string;
      top_posts?: { url: string; title: string; views: number; comments: number; likes: number }[];
    };

    const topicLines = (parsed.main_topics || [])
      .map((t) => `• ${t.topic} (${t.post_count}건, ${t.sentiment})`)
      .join("\n");
    const reactionLines = (parsed.official_event_reactions || [])
      .map((r) => `• ${r.event_title}: ${r.reaction} [${r.confidence === "confirmed" ? "직접 언급 확인" : "추정"}]`)
      .join("\n");

    // top_posts URL 검증 - 제공된 게시글에 있는 것만 허용
    const validUrls = new Set(sortedPosts.map((p) => p.link));
    const sourceLinks: SourceLink[] = (parsed.top_posts || [])
      .filter((p) => p.url && validUrls.has(p.url))
      .slice(0, 5)
      .map((p) => ({ url: p.url, title: p.title, views: p.views, comments: p.comments, likes: p.likes }));

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
      ].filter(Boolean).join("\n\n"),
      sourceLinks,
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

// 공식 이벤트/업데이트에 대한 DC 유저 반응 분석
export async function analyzeEventReaction(
  gameName: string,
  eventDate: string,
  events: ForumPost[],
  dcPosts: DcPost[],
  gameId: string
): Promise<TimelineItem | null> {
  if (dcPosts.length < 3 || events.length === 0) return null;

  // 이벤트 키워드 추출 (제목에서 의미있는 단어만)
  const stopWords = new Set(["및", "안내", "업데이트", "이벤트", "패치", "공지", "진행중", "완료", "예정", "이번", "추가", "변경"]);
  const eventKeywords = events
    .flatMap((e) => e.title.replace(/[\[\]()【】]/g, " ").split(/\s+/))
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  // 키워드 관련도 점수로 DC 게시글 정렬: 이벤트 관련 글 우선 샘플링
  const scored = dcPosts.map((p) => {
    const text = (p.title + " " + p.body).toLowerCase();
    const score = eventKeywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    return { post: p, score };
  });
  scored.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : byEngagement(a.post, b.post)
  );

  // 관련 게시글 최대 30개 (관련도 높은 것 우선, 최소 참여도 기준 포함)
  const relevantPosts = scored
    .filter((s) => s.score > 0 || s.post.views >= 100 || s.post.comments >= 5)
    .slice(0, 30)
    .map((s) => s.post);

  if (relevantPosts.length < 2) return null;

  const eventSummary = events.map((e) => `- ${e.title}`).join("\n");

  const prompt = `당신은 게임 커뮤니티 분석가입니다.
${gameName}에서 ${eventDate}에 다음 공식 이벤트/공지/패치가 있었습니다.

[공식 이벤트/공지/패치]
${formatForumPosts(events)}

아래는 이 시기 DC 갤러리에서 해당 내용과 관련된 게시글입니다:

[DC 갤러리 관련 게시글]
${formatDcPosts(relevantPosts, 30)}

다음 JSON만 반환하세요 (다른 텍스트 없이):
{
  "reaction_title": "유저들이 실제로 반응한 핵심 주제 (예: '신규 카드팩 보상 부족 논란', '밸런스 패치 후 캐릭터 강화 환급 요구', '이벤트 보상 좋다는 반응')",
  "reaction_summary": "구체적인 유저 반응 내용 (150자 이내, 무슨 점에 대해 어떻게 반응했는지)",
  "sentiment": "positive/negative/neutral/mixed",
  "key_mentions": ["유저들이 많이 언급한 키워드1", "키워드2"],
  "direct_mentions": true 또는 false,
  "top_posts": [
    {"url": "게시글링크", "title": "게시글제목", "views": 조회수, "comments": 댓글수, "likes": 추천수}
  ]
}

[규칙 - 반드시 준수]
- reaction_title: 날짜 금지. 이벤트명을 반복하지 말고 유저 반응의 핵심을 한 줄로
- top_posts: 위 게시글 목록의 URL만 사용 (URL 변형/생성 절대 금지)
- top_posts: 해당 이벤트를 직접 다루는 게시글 1~5개, 관련 없으면 빈 배열
- direct_mentions: DC에서 해당 이벤트/패치를 직접 언급한 경우만 true
- 공식 이벤트가 없다면: 이 기간 DC에서 가장 화제였던 유저 자체 이슈로 대체`;

  try {
    const parsed = (await callGemini(prompt)) as {
      reaction_title: string;
      reaction_summary: string;
      sentiment: string;
      key_mentions: string[];
      direct_mentions: boolean;
      top_posts?: { url: string; title: string; views: number; comments: number; likes: number }[];
    };

    const validUrls = new Set(relevantPosts.map((p) => p.link));
    const sourceLinks: SourceLink[] = (parsed.top_posts || [])
      .filter((p) => p.url && validUrls.has(p.url))
      .slice(0, 5)
      .map((p) => ({ url: p.url, title: p.title, views: p.views, comments: p.comments, likes: p.likes }));

    // 키워드를 detail에 포함
    const keywordStr = (parsed.key_mentions || []).join(", ");
    const detail = keywordStr ? `주요 키워드: ${keywordStr}` : "";

    // 제목: AI 생성 제목 우선, 없으면 이벤트 제목 기반 fallback
    const fallbackTitle = events.map((e) => e.title.replace(/[\[\]【】]/g, "").trim()).slice(0, 2).join(" · ") + " 유저 반응";

    return {
      id: `reaction-${eventDate}`,
      gameId,
      date: eventDate,
      type: "event_reaction",
      title: parsed.reaction_title || fallbackTitle,
      summary: parsed.reaction_summary || "",
      detail,
      sourceLinks,
      evidenceCount: relevantPosts.length,
      evidenceMetrics: {
        postCount: relevantPosts.length,
        avgViews: Math.round(relevantPosts.reduce((s, p) => s + p.views, 0) / relevantPosts.length),
        avgComments: Math.round(relevantPosts.reduce((s, p) => s + p.comments, 0) / relevantPosts.length),
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
  gameId: string
): Promise<TimelineItem[]> {
  // 날짜 범위 방어 필터: 호출 측에서 이미 필터했더라도 재확인
  const periodPosts = dcPosts.filter((p) => p.date >= fromDate && p.date <= toDate);
  const highEngagement = periodPosts.filter(
    (p) => p.views >= 300 || p.comments >= 20 || p.likes >= 5
  );
  if (highEngagement.length < 3) return [];

  const sortedPosts = [...highEngagement].sort(byEngagement).slice(0, 50);

  const prompt = `당신은 게임 커뮤니티 분석가입니다.
아래는 ${gameName} DC 갤러리 ${fromDate} ~ ${toDate} 기간 높은 참여도 게시글입니다.

[게시글 목록]
${formatDcPosts(sortedPosts, 50)}

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
      "start_date": "YYYY-MM-DD",
      "top_posts": [
        {"url": "게시글링크", "title": "게시글제목", "views": 조회수, "comments": 댓글수, "likes": 추천수}
      ]
    }
  ]
}

[top_posts 규칙 - 반드시 준수]
- 반드시 위에 제공된 게시글 목록에 있는 URL과 제목만 사용 (URL 변형/생성 절대 금지)
- 해당 이슈를 직접 다루는 게시글 1~5개만 선택
- 조회수 1000 이상 또는 댓글 10개 이상인 게시글 우선
- 제공되지 않은 URL은 절대 포함하지 말 것

[이슈 감지 규칙]
- 최소 3개 이상 게시글이 동일 이슈를 다루는 경우만 분류
- 단순 불만은 이슈 아님, 집단적 문제 제기여야 함
- 감지된 이슈 없으면 issues:[]`;

  try {
    const parsed = (await callGemini(prompt)) as {
      issues: {
        title: string;
        summary: string;
        evidence_post_count: number;
        avg_views: number;
        avg_comments: number;
        start_date: string;
        top_posts?: { url: string; title: string; views: number; comments: number; likes: number }[];
      }[];
    };

    const validUrls = new Set(sortedPosts.map((p) => p.link));

    return (parsed.issues || []).map((issue) => {
      const sourceLinks: SourceLink[] = (issue.top_posts || [])
        .filter((p) => p.url && validUrls.has(p.url))
        .slice(0, 5)
        .map((p) => ({ url: p.url, title: p.title, views: p.views, comments: p.comments, likes: p.likes }));

      // start_date가 분석 기간 밖이면 fromDate로 클램프 (날짜 오염 방지)
      const issueDate =
        issue.start_date && issue.start_date >= fromDate && issue.start_date <= toDate
          ? issue.start_date
          : fromDate;

      return {
        id: `issue-${issueDate}-${Math.random().toString(36).slice(2, 8)}`,
        gameId,
        date: issueDate,
        type: "user_issue" as TimelineItem["type"],
        title: issue.title,
        summary: issue.summary,
        detail: `근거: 관련 게시글 ${issue.evidence_post_count}건, 평균 조회수 ${issue.avg_views}, 평균 댓글 ${issue.avg_comments}`,
        sourceLinks,
        evidenceCount: issue.evidence_post_count || 0,
        evidenceMetrics: {
          postCount: issue.evidence_post_count,
          avgViews: issue.avg_views,
          avgComments: issue.avg_comments,
        },
        relatedEventDate: null,
        dcSentiment: "negative" as TimelineItem["dcSentiment"],
        createdAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error("Issue detection error:", err);
    return [];
  }
}

// 전체 AI 분석 오케스트레이션
export async function generateTimeline(
  game: {
    id: string;
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

  // 1. 공식 이벤트 → AI 요약 변환
  const byDateType: Record<string, { rawType: string; posts: ForumPost[] }> = {};
  for (const post of filteredForum) {
    const key = `${post.date}__${post.type}`;
    if (!byDateType[key]) byDateType[key] = { rawType: post.type, posts: [] };
    byDateType[key].posts.push(post);
  }
  const officialItems: TimelineItem[] = [];
  for (const [key, { rawType, posts }] of Object.entries(byDateType)) {
    const [date] = key.split("__");
    const item = await summarizeForumGroup(game.name, date, rawType, posts, game.id);
    officialItems.push(item);
  }

  // 2. 이벤트 날짜별 DC 반응 분석
  const eventDates = Array.from(new Set(filteredForum.map((p) => p.date)));
  const reactionItems: TimelineItem[] = [];

  for (const eventDate of eventDates) {
    const eventsOnDate = filteredForum.filter((p) => p.date === eventDate);
    const from3 = format(subDays(parseISO(eventDate), 3), "yyyy-MM-dd");
    const to3 = format(addDays(parseISO(eventDate), 3), "yyyy-MM-dd");
    const nearbyDc = dcPosts.filter((p) => p.date >= from3 && p.date <= to3);

    const item = await analyzeEventReaction(game.name, eventDate, eventsOnDate, nearbyDc, game.id);
    if (item) reactionItems.push(item);
  }

  // 3. 주간 요약 + 유저 이슈 감지 (동일한 주 단위로 묶어서 처리)
  const weeklyItems: TimelineItem[] = [];
  const issueItems: TimelineItem[] = [];

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

      // 주간 요약
      const summaryItem = await analyzeWeeklySummary(game.name, wStart, wEnd, weekDc, weekForum, game.id);
      if (summaryItem) weeklyItems.push(summaryItem);

      // 유저 이슈 감지: 해당 주의 게시글만 넘겨서 날짜 오염 방지
      const weekIssues = await detectUserIssues(game.name, wStart, wEnd, weekDc, game.id);
      issueItems.push(...weekIssues);
    }
  }

  // (issueItems는 위 루프에서 이미 채워짐 — 별도 호출 불필요)

  return [...officialItems, ...reactionItems, ...weeklyItems, ...issueItems].sort(
    (a, b) => a.date.localeCompare(b.date)
  );
}
