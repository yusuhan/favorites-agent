import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, withUser } from "@/lib/api";
import { ingest } from "@/lib/ingest";
import { ITEM_COLUMNS } from "@/lib/types";

// 解析 + 生成行动卡 + 算向量，单条可能要十几秒
export const maxDuration = 60;

export async function GET() {
  const { sb, denied } = await withUser();
  if (denied) return denied;
  const { data, error } = await sb.from("items").select(ITEM_COLUMNS).order("created_at", { ascending: false }).limit(100);
  if (error) return fail(error);
  return NextResponse.json({ items: data });
}

// 截图在浏览器里先压缩成 JPEG 再传，Vercel 单个请求体上限 4.5MB
const Body = z
  .object({
    input: z.string().trim().min(1, "内容不能为空").max(20000).optional(),
    image: z
      .string()
      .regex(/^data:image\/(jpeg|png|webp);base64,/, "截图格式不对")
      .max(4_000_000, "截图太大")
      .optional(),
    note: z.string().trim().max(200).optional(),
    remind: z.boolean().default(true),
  })
  .refine((b) => !!b.input !== !!b.image, "链接文字和截图要二选一");

export async function POST(req: Request) {
  const { sb, denied } = await withUser();
  if (denied) return denied;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(new Error(body.error.issues[0].message), 400);

  try {
    const { input, image, note, remind } = body.data;
    const source = image ? { image } : { text: input! };
    return NextResponse.json(await ingest(sb, source, note || null, remind));
  } catch (e) {
    return fail(e, 422);
  }
}
