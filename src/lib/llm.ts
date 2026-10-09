import OpenAI from "openai";

// DeepSeek 兼容 OpenAI 的接口格式，换模型时只改这里
function client() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
}

export type Digest = { title: string | null; summary: string; tags: string[] };

const PROMPT = `你在帮用户整理收藏。读下面这条收藏的内容，只输出 JSON：
{"title": "如果原标题为空就起一个 20 字内的标题，否则原样返回", "summary": "3 句话内的摘要，只写内容里有的信息", "tags": ["2 到 4 个中文标签"]}`;

export async function digest(title: string | null, content: string): Promise<Digest | null> {
  const ai = client();
  if (!ai) return null; // 没配 key 时跳过整理，收藏照样入库
  const res = await ai.chat.completions.create({
    model: "deepseek-chat",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PROMPT },
      { role: "user", content: `标题：${title ?? "（无）"}\n\n内容：\n${content.slice(0, 6000)}` },
    ],
  });
  const out = JSON.parse(res.choices[0].message.content ?? "{}");
  return {
    title: out.title || title,
    summary: String(out.summary ?? ""),
    tags: Array.isArray(out.tags) ? out.tags.map(String).slice(0, 4) : [],
  };
}
