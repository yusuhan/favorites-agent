import type { Item } from "./types";

export const WEEKLY_COUNT = 3;
export const MIN_AGE_DAYS = 2; // 刚存的不进回顾，存时已经看过一次行动卡
export const REPEAT_AFTER_DAYS = 28; // 推过的卡 4 周内不再推

type Candidate = Pick<Item, "id" | "category" | "card_action" | "card_feedback" | "created_at">;

// 挑这周最值得做的几张：有具体小动作的优先，用户点过“以后再说”的优先，越久没碰的越优先；
// 先每个分类最多挑一张，保证不全是同一类，不够再补
export function pickWeekly<T extends Candidate>(items: T[], recentlySent: Set<string>, n = WEEKLY_COUNT): T[] {
  const pool = items
    .filter((it) => !recentlySent.has(it.id) && (it.card_feedback === null || it.card_feedback === "later"))
    .sort(
      (a, b) =>
        Number(!!b.card_action) - Number(!!a.card_action) ||
        Number(b.card_feedback === "later") - Number(a.card_feedback === "later") ||
        a.created_at.localeCompare(b.created_at),
    );

  const picked: T[] = [];
  const seen = new Set<string>();
  for (const it of pool) {
    if (picked.length >= n) break;
    const cat = it.category ?? "其他";
    if (seen.has(cat)) continue;
    seen.add(cat);
    picked.push(it);
  }
  for (const it of pool) {
    if (picked.length >= n) break;
    if (!picked.includes(it)) picked.push(it);
  }
  return picked;
}

export function renderEmail(items: Item[], appUrl: string): { subject: string; html: string } {
  const cards = items
    .map(
      (it) => `
  <div style="border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin:0 0 12px">
    <div style="font-size:12px;color:#888">${esc(it.category ?? "其他")}</div>
    <div style="font-weight:600;margin:4px 0">${esc(it.title ?? "无标题")}</div>
    ${it.card_point ? `<div style="margin:8px 0">${esc(it.card_point)}</div>` : ""}
    ${it.card_action ? `<div style="background:#fffbeb;border-radius:6px;padding:8px 12px"><b>这周试试：</b>${esc(it.card_action)}</div>` : ""}
    ${it.url ? `<div style="margin-top:8px;font-size:13px"><a href="${esc(it.url)}">看原文</a></div>` : ""}
  </div>`,
    )
    .join("");
  return {
    subject: `这周从收藏夹里挑了 ${items.length} 件小事`,
    html: `<div style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:560px;margin:auto;color:#171717">
  <p>这些是你收藏了还没动过的内容，每件都能在 15 分钟内开始：</p>
  ${cards}
  <p style="font-size:13px;color:#666">做了的话，回到 <a href="${esc(appUrl)}">收藏夹 Agent</a> 点一下“做了”。</p>
</div>`,
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
