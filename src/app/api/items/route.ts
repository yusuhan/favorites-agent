import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { digest } from "@/lib/llm";
import { findUrl, guessSource, parseInput } from "@/lib/parse";

export async function GET() {
  const { data, error } = await db()
    .from("items")
    .select("id, source, url, title, summary, tags, note, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

const Body = z.object({
  input: z.string().trim().min(1, "内容不能为空").max(20000),
  note: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const { input, note } = body.data;

  try {
    const parsed = await parseInput(input);
    const d = await digest(parsed.title, parsed.content);
    const { data, error } = await db()
      .from("items")
      .insert({
        ...parsed,
        title: d?.title ?? parsed.title,
        summary: d?.summary ?? null,
        tags: d?.tags ?? [],
        note: note || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ item: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // 失败也记一条，用来算各来源的解析成功率
    await db()
      .from("items")
      .insert({ source: guessSource(input), url: findUrl(input), content: input, status: "failed", error: message, note: note || null });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
