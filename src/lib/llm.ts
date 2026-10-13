import OpenAI from "openai";
import { CATEGORIES, type Category } from "./types";

// DeepSeek 兼容 OpenAI 的接口格式，换模型时只改这里
const MODEL = "deepseek-chat";

function client() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("缺少 DEEPSEEK_API_KEY，见 .env.example");
  return new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
}

async function json(system: string, user: string): Promise<Record<string, unknown>> {
  const res = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(res.choices[0].message.content ?? "{}");
}

export type Card = {
  title: string | null;
  category: Category;
  summary: string;
  point: string;
  action: string | null;
  tags: string[];
};

const CARD_PROMPT = `你在帮用户把一条收藏变成“行动卡”，让他不用重读原文也能用上它。
只依据给出的内容，不要补充内容里没有的信息。只输出 JSON：
{
  "title": "原标题为空时起一个 20 字内的标题，否则原样返回",
  "category": "穿搭 | 美食 | 教程 | 认知 | 其他，选一个",
  "summary": "3 句话内的摘要",
  "point": "最值得记住的一句话，30 字内",
  "action": "15 分钟内能开始的一个具体小动作，40 字内；内容里找不到具体可做的事就填 null",
  "tags": ["2 到 4 个中文标签"]
}
小动作的写法：
- 穿搭：用一件常见单品照着试一次，写清楚怎么搭
- 美食：写出要买的食材，或第一步怎么做
- 教程（软件、AI 工具、健身、化妆、手工等）：写出跟着做的第一步，有时间点或步骤号就带上
- 认知：一个今天就能用上的场景；只是观点、没有可做的事就填 null，不要硬凑`;

export async function makeCard(title: string | null, content: string): Promise<Card> {
  const out = await json(CARD_PROMPT, `标题：${title ?? "（无）"}\n\n内容：\n${content.slice(0, 8000)}`);
  const category = CATEGORIES.includes(out.category as Category) ? (out.category as Category) : "其他";
  const action = typeof out.action === "string" && out.action.trim() ? out.action.trim() : null;
  return {
    title: (typeof out.title === "string" && out.title.trim()) || title,
    category,
    summary: String(out.summary ?? ""),
    point: String(out.point ?? ""),
    action,
    tags: Array.isArray(out.tags) ? out.tags.map(String).slice(0, 4) : [],
  };
}

export type Snippet = { n: number; title: string; text: string };

const ANSWER_PROMPT = `你只能根据用户自己的收藏片段回答问题。每个片段前有编号 [n]。
规则：
- 每句话后面用 [n] 标出依据的片段编号
- 片段里没有能回答问题的信息时，answer 填 null，不要用你自己的知识补充
只输出 JSON：{"answer": "回答或 null", "used": [用到的片段编号]}`;

export async function answer(question: string, snippets: Snippet[]): Promise<{ answer: string | null; used: number[] }> {
  if (snippets.length === 0) return { answer: null, used: [] };
  const context = snippets.map((s) => `[${s.n}]《${s.title}》\n${s.text}`).join("\n\n");
  const out = await json(ANSWER_PROMPT, `收藏片段：\n${context}\n\n问题：${question}`);
  const text = typeof out.answer === "string" && out.answer.trim() ? out.answer.trim() : null;
  const used = Array.isArray(out.used) ? out.used.map(Number).filter((n) => snippets.some((s) => s.n === n)) : [];
  return { answer: text, used: text ? used : [] };
}
