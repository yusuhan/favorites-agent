export const CATEGORIES = ["穿搭", "美食", "教程", "认知", "其他"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Feedback = "done" | "later" | "dismissed";

export type Item = {
  id: string;
  source: "wechat" | "bilibili" | "web" | "text" | "image";
  url: string | null;
  title: string | null;
  summary: string | null;
  tags: string[];
  note: string | null;
  category: Category | null;
  card_point: string | null;
  card_action: string | null;
  card_feedback: Feedback | null;
  status: "ok" | "failed";
  error: string | null;
  created_at: string;
};

// 列表和接口返回用的列，不带原文和向量
export const ITEM_COLUMNS =
  "id, source, url, title, summary, tags, note, category, card_point, card_action, card_feedback, status, error, created_at";

export type Reminder = { id: string; similarity: number; item: Item };
