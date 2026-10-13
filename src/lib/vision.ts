import OpenAI from "openai";

// 通义千问 VL，和向量共用阿里云百炼的 key
const MODEL = "qwen-vl-max";

const PROMPT = `这是用户从小红书、抖音、微信等 App 里截下来的一张收藏截图。请把它变成文字，供后续整理使用：
1. 第一行写“标题：”加上截图里的标题；没有明显标题就根据内容起一个 20 字内的
2. 原样抄下截图里所有正文文字（不要抄点赞数、评论数、按钮、状态栏这类界面文字）
3. 如果画面里有文字之外的重要信息，用“画面：”开头描述出来，例如穿搭里每件衣服的颜色和款式、菜品的样子、教程里的操作界面
只输出这些内容，不要加评论。`;

export async function readImage(dataUrl: string): Promise<{ title: string | null; content: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("缺少 DASHSCOPE_API_KEY，见 .env.example");
  const ai = new OpenAI({ apiKey, baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" });

  const res = await ai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const text = (res.choices[0].message.content ?? "").trim();
  if (!text) throw new Error("没从截图里读到内容");
  return splitTitle(text);
}

export function splitTitle(text: string): { title: string | null; content: string } {
  const m = text.match(/^标题[:：]\s*(.+)\n?/);
  if (!m) return { title: null, content: text };
  return { title: m[1].trim() || null, content: text.slice(m[0].length).trim() || text };
}
