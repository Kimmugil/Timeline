export type GameConfig = {
  id: number;
  name: string;
  slug: string;
  dc_raw_sheet_id: string;
  dc_sheet_tab: string;
  forum_raw_sheet_id: string;
  processed_sheet_id: string | null;
  metric_columns: string[];
  created_at: string;
};

export type TimelineItemType =
  | "official_patch"
  | "official_event"
  | "official_notice"
  | "user_issue"
  | "weekly_summary"
  | "event_reaction";

export type TimelineItem = {
  id: string;
  gameId: number;
  date: string;
  type: TimelineItemType;
  title: string;
  summary: string;
  detail: string;
  sourceLinks: string[];
  evidenceCount: number;
  evidenceMetrics: {
    avgViews?: number;
    avgComments?: number;
    totalEngagement?: number;
    postCount?: number;
  } | null;
  relatedEventDate: string | null;
  dcSentiment: "positive" | "negative" | "neutral" | "mixed" | null;
  createdAt: string;
};

export type ForumPost = {
  id: string;
  title: string;
  body: string;
  author: string;
  date: string;
  link: string;
  views: number;
  likes: number;
  type: "notice" | "patch" | "event";
};

export type DcPost = {
  id: string;
  title: string;
  body: string;
  author: string;
  date: string;
  link: string;
  comments: number;
  views: number;
  likes: number;
};

export type MetricEntry = {
  date: string;
  data: Record<string, number>;
};

export type ChartDataPoint = {
  date: string;
  [metric: string]: number | string | null | undefined;
};
