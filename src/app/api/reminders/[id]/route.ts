import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, withUser } from "@/lib/api";

const Body = z.object({
  opened: z.literal(true).optional(),
  feedback: z.enum(["done", "later", "dismissed"]).optional(),
});

// 记录提醒被点开、被反馈，用来算点开率和打扰率
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sb, denied } = await withUser();
  if (denied) return denied;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(new Error("参数不对"), 400);

  const { id } = await params;
  const patch: Record<string, string> = {};
  if (body.data.opened) patch.opened_at = new Date().toISOString();
  if (body.data.feedback) patch.feedback = body.data.feedback;
  const { error } = await sb.from("reminders").update(patch).eq("id", id);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}
