import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, withUser } from "@/lib/api";
import { embed, toPg } from "@/lib/embed";
import { answer, type Snippet } from "@/lib/llm";

export const maxDuration = 60;

const TOP_K = 8;

const Body = z.object({ question: z.string().trim().min(1, "问题不能为空").max(500) });

// 只用当前用户自己的收藏回答，答不上就返回 answer: null
export async function POST(req: Request) {
  const { sb, denied } = await withUser();
  if (denied) return denied;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(new Error(body.error.issues[0].message), 400);
  const { question } = body.data;

  try {
    const [vec] = await embed([question]);
    const { data: hits, error } = await sb.rpc("match_chunks", { query_embedding: toPg(vec), match_count: TOP_K });
    if (error) throw new Error(error.message);
    const rows = hits as { item_id: string; text: string; similarity: number }[];

    const ids = [...new Set(rows.map((r) => r.item_id))];
    const { data: items } = ids.length
      ? await sb.from("items").select("id, title, url").in("id", ids)
      : { data: [] as { id: string; title: string | null; url: string | null }[] };
    const byId = new Map((items ?? []).map((i) => [i.id, i]));

    const snippets: (Snippet & { item_id: string })[] = rows.map((r, i) => ({
      n: i + 1,
      item_id: r.item_id,
      title: byId.get(r.item_id)?.title ?? "无标题",
      text: r.text,
    }));
    const result = await answer(question, snippets);

    const sourceIds = [...new Set(result.used.map((n) => snippets[n - 1].item_id))];
    await sb.from("questions").insert({ question, answer: result.answer, source_item_ids: sourceIds });

    return NextResponse.json({
      answer: result.answer,
      sources: result.used.map((n) => {
        const s = snippets[n - 1];
        const it = byId.get(s.item_id);
        return { n, item_id: s.item_id, title: s.title, url: it?.url ?? null };
      }),
    });
  } catch (e) {
    return fail(e);
  }
}
