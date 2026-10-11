import OpenAI from "openai";

// 通义 text-embedding-v3，走阿里云百炼的 OpenAI 兼容接口；维度要和 schema.sql 里的 vector(1024) 一致
const MODEL = "text-embedding-v3";
const DIM = 1024;
const BATCH = 10; // 接口单次最多 10 条

function client() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("缺少 DASHSCOPE_API_KEY，见 .env.example");
  return new OpenAI({ apiKey, baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" });
}

export async function embed(texts: string[]): Promise<number[][]> {
  const ai = client();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await ai.embeddings.create({
      model: MODEL,
      dimensions: DIM,
      input: texts.slice(i, i + BATCH),
      encoding_format: "float",
    });
    out.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  return out;
}

// pgvector 接受 "[0.1,0.2,...]" 形式的字符串
export function toPg(v: number[]): string {
  return `[${v.join(",")}]`;
}
