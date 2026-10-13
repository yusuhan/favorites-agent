import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ITEM_COLUMNS, type Item } from "@/lib/types";
import { MIN_AGE_DAYS, REPEAT_AFTER_DAYS, pickWeekly, renderEmail } from "@/lib/weekly";

export const maxDuration = 60;

// 每周回顾：Vercel Cron 按 vercel.json 的时间调用，请求头带 CRON_SECRET，防止别人随便触发发信
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const appUrl = process.env.APP_URL ?? "";
  const now = Date.now();
  const before = new Date(now - MIN_AGE_DAYS * 864e5).toISOString();
  const since = new Date(now - REPEAT_AFTER_DAYS * 864e5).toISOString();

  const summary = { users: 0, sent: 0, skipped: 0, failed: [] as string[] };
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const user of data.users) {
      if (!user.email) continue;
      summary.users++;
      try {
        const sentOne = await sendTo(sb, user.id, user.email, before, since, appUrl);
        if (sentOne) summary.sent++;
        else summary.skipped++;
      } catch (e) {
        summary.failed.push(`${user.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (data.users.length < 1000) break;
  }
  return NextResponse.json(summary);
}

async function sendTo(
  sb: ReturnType<typeof supabaseAdmin>,
  userId: string,
  email: string,
  before: string,
  since: string,
  appUrl: string,
): Promise<boolean> {
  const { data: items, error } = await sb
    .from("items")
    .select(ITEM_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "ok")
    .not("card_point", "is", null)
    .lt("created_at", before)
    .returns<Item[]>();
  if (error) throw new Error(error.message);

  const { data: recent } = await sb.from("weekly_picks").select("item_id").eq("user_id", userId).gte("sent_at", since);
  const picks = pickWeekly(items ?? [], new Set((recent ?? []).map((r) => r.item_id)));
  if (picks.length === 0) return false; // 没有可推的就不发，不发空邮件

  const { subject, html } = renderEmail(picks, appUrl);
  await sendMail(email, subject, html);
  await sb.from("weekly_picks").insert(picks.map((p) => ({ user_id: userId, item_id: p.id })));
  return true;
}

// Resend 发信：https://resend.com，MAIL_FROM 要用在 Resend 里验证过的域名
async function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) throw new Error("缺少 RESEND_API_KEY 或 MAIL_FROM");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`发信失败：HTTP ${res.status} ${await res.text()}`);
}
