import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "./chunk";
import { embed, toPg } from "./embed";
import { makeCard } from "./llm";
import { findUrl, guessSource, parseInput, type Parsed } from "./parse";
import { ITEM_COLUMNS, type Item, type Reminder } from "./types";
import { readImage } from "./vision";

// 新收藏和旧收藏的相似度超过这个值才提醒。先拍一个起点，用评测集里的 40 个提醒场景调
export const REMIND_MIN_SIMILARITY = 0.55;
const MAX_CHUNKS = 40;

export type IngestResult = { item: Item; reminder: Reminder | null };

// 一条收藏的来源：粘贴的文字/链接，或一张截图（data URL）
export type IngestInput = { text: string } | { image: string };

// 收一条：解析 → 生成行动卡 → 算向量入库 → 找一条相关旧收藏
// 批量搬老收藏时 remind=false：那时用户不在“正在想这个话题”的时刻，提醒没意义，也会污染点开率
export async function ingest(
  sb: SupabaseClient,
  input: IngestInput,
  note: string | null,
  remind = true,
): Promise<IngestResult> {
  try {
    return await ingestOk(sb, input, note, remind);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // 失败也记一条，用来算各来源的解析成功率
    // 截图本身不存，只记一条失败
    const text = "text" in input ? input.text : null;
    await sb.from("items").insert({
      source: text === null ? "image" : guessSource(text),
      url: text === null ? null : findUrl(text),
      content: text ?? "（截图）",
      note,
      status: "failed",
      error: message,
    });
    throw e;
  }
}

async function ingestOk(sb: SupabaseClient, input: IngestInput, note: string | null, remind: boolean): Promise<IngestResult> {
  const parsed: Parsed =
    "text" in input ? await parseInput(input.text) : { source: "image", url: null, ...(await readImage(input.image)) };
  const card = await makeCard(parsed.title, parsed.content);
  const chunks = chunkText(parsed.content).slice(0, MAX_CHUNKS);
  const itemText = [card.title, card.point, card.summary, note].filter(Boolean).join("\n");
  const [itemVec, ...chunkVecs] = await embed([itemText, ...chunks]);

  const { data: item, error } = await sb
    .from("items")
    .insert({
      ...parsed,
      title: card.title,
      summary: card.summary,
      tags: card.tags,
      category: card.category,
      card_point: card.point,
      card_action: card.action,
      note,
      embedding: toPg(itemVec),
    })
    .select(ITEM_COLUMNS)
    .single<Item>();
  if (error) throw new Error(`保存失败：${error.message}`);

  if (chunks.length > 0) {
    const rows = chunks.map((text, idx) => ({ item_id: item.id, idx, text, embedding: toPg(chunkVecs[idx]) }));
    const { error: chunkError } = await sb.from("chunks").insert(rows);
    if (chunkError) throw new Error(`保存原文切块失败：${chunkError.message}`);
  }

  return { item, reminder: remind ? await findReminder(sb, item.id, itemVec) : null };
}

async function findReminder(sb: SupabaseClient, newItemId: string, vec: number[]): Promise<Reminder | null> {
  const { data: matches, error } = await sb.rpc("match_items", {
    query_embedding: toPg(vec),
    exclude_id: newItemId,
    match_count: 1,
  });
  if (error) throw new Error(`查找相关收藏失败：${error.message}`);
  const best = (matches as { id: string; similarity: number }[])[0];
  if (!best || best.similarity < REMIND_MIN_SIMILARITY) return null;

  const { data: old } = await sb.from("items").select(ITEM_COLUMNS).eq("id", best.id).single<Item>();
  if (!old) return null;
  const { data: row } = await sb
    .from("reminders")
    .insert({ new_item_id: newItemId, old_item_id: old.id, similarity: best.similarity })
    .select("id")
    .single<{ id: string }>();
  return row ? { id: row.id, similarity: best.similarity, item: old } : null;
}
