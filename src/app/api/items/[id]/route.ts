import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, withUser } from "@/lib/api";

const Body = z.object({ feedback: z.enum(["done", "later", "dismissed"]).nullable() });

// 行动卡反馈：做了 / 以后再说 / 不感兴趣
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sb, denied } = await withUser();
  if (denied) return denied;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(new Error("反馈值不对"), 400);

  const { id } = await params;
  const { error } = await sb
    .from("items")
    .update({ card_feedback: body.data.feedback, card_feedback_at: body.data.feedback ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sb, denied } = await withUser();
  if (denied) return denied;
  const { id } = await params;
  const { error } = await sb.from("items").delete().eq("id", id);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}
