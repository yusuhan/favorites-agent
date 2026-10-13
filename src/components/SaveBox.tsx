"use client";

import { useState } from "react";
import { splitBatch } from "@/lib/chunk";
import { compressImage } from "@/lib/image";
import type { Feedback, Item, Reminder } from "@/lib/types";
import ItemCard from "./ItemCard";

type Result = { item: Item; reminder: Reminder | null };

// 收藏入口：一条链接、一段分享文案，或一次粘贴多条链接搬老收藏
export default function SaveBox({ onSaved }: { onSaved: () => void }) {
  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0); // 换 key 清空文件选择框

  // 有截图时只收截图；否则按链接拆分
  const parts: { label: string; body: () => Promise<Record<string, unknown>> }[] = files.length
    ? files.map((f) => ({ label: f.name, body: async () => ({ image: await compressImage(f) }) }))
    : splitBatch(input).map((p) => ({ label: p, body: async () => ({ input: p }) }));
  const batch = parts.length > 1;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (parts.length === 0 || progress) return;
    setMsg(null);
    setResult(null);
    setReminderOpen(false);

    let ok = 0;
    const failed: string[] = [];
    let last: Result | null = null;
    for (const [i, part] of parts.entries()) {
      setProgress(batch ? `正在收第 ${i + 1} / ${parts.length} 条…` : "正在读、生成行动卡…");
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(await part.body()), note: batch ? undefined : note || undefined, remind: !batch }),
        });
        const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (res.ok) {
          ok++;
          last = json;
        } else {
          failed.push(`${batch ? part.label + "：" : ""}${json.error}`);
        }
      } catch (err) {
        failed.push(`${batch ? part.label + "：" : ""}${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setProgress(null);

    if (batch) {
      setMsg(`收好 ${ok} 条${failed.length ? `，${failed.length} 条没收成功：\n${failed.join("\n")}` : ""}`);
    } else if (last) {
      setResult(last);
    } else {
      setMsg(`没收成功：${failed[0]}`);
    }
    if (ok > 0) {
      setInput("");
      setNote("");
      setFiles([]);
      setFileKey((k) => k + 1);
    }
    onSaved();
  }

  async function patchItem(id: string, feedback: Feedback | null) {
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    setResult((r) => {
      if (!r) return r;
      if (r.item.id === id) return { ...r, item: { ...r.item, card_feedback: feedback } };
      if (r.reminder?.item.id === id) return { ...r, reminder: { ...r.reminder, item: { ...r.reminder.item, card_feedback: feedback } } };
      return r;
    });
    onSaved();
  }

  async function patchReminder(body: { opened?: true; feedback?: Feedback }) {
    if (!result?.reminder) return;
    await fetch(`/api/reminders/${result.reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function openReminder() {
    setReminderOpen(true);
    patchReminder({ opened: true });
  }

  return (
    <section>
      <form onSubmit={save} className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"粘贴链接或分享文案\n搬老收藏：一次粘贴多条链接，每行一条"}
          rows={4}
          className="input"
          disabled={files.length > 0}
        />
        <label className="block text-sm">
          <span className="opacity-70">或者上传截图（小红书、抖音的收藏推荐用截图，可多选）：</span>
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1 block w-full text-sm"
          />
        </label>
        {!batch && (
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="为什么存？（可不填）" className="input" />
        )}
        <button type="submit" disabled={!!progress || parts.length === 0} className="btn">
          {progress ?? (batch ? `收藏这 ${parts.length} 条` : "收藏")}
        </button>
        {msg && <p className="whitespace-pre-wrap text-sm">{msg}</p>}
      </form>

      {result && (
        <div className="mt-6 space-y-3">
          <p className="text-sm opacity-70">收好了，这是它的行动卡：</p>
          <ItemCard item={result.item} onFeedback={(f) => patchItem(result.item.id, f)} />
          {result.reminder && (
            <div className="rounded-lg border border-dashed border-amber-400 p-3">
              <p className="text-sm">
                你 {ago(result.reminder.item.created_at)}也存过一条相关的：《{result.reminder.item.title ?? "无标题"}》
                {!reminderOpen && (
                  <button onClick={openReminder} className="ml-2 underline">
                    看看
                  </button>
                )}
              </p>
              {reminderOpen && (
                <div className="mt-3">
                  <ItemCard
                    item={result.reminder.item}
                    onFeedback={(f) => {
                      patchItem(result.reminder!.item.id, f);
                      if (f) patchReminder({ feedback: f });
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ago(s: string) {
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 864e5);
  if (days <= 0) return "今天";
  if (days < 7) return `${days} 天前`;
  if (days < 60) return `${Math.floor(days / 7)} 周前`;
  return `${Math.floor(days / 30)} 个月前`;
}
