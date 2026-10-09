"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  source: string;
  url: string | null;
  title: string | null;
  summary: string | null;
  tags: string[];
  note: string | null;
  status: "ok" | "failed";
  error: string | null;
  created_at: string;
};

const SOURCE_LABEL: Record<string, string> = {
  wechat: "公众号",
  bilibili: "B 站",
  web: "网页",
  text: "文字",
};

export default function Home() {
  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/items");
    const json = await res.json();
    if (res.ok) setItems(json.items);
    else setMessage(json.error);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || saving) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, note: note || undefined }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setInput("");
      setNote("");
      setMessage("已收藏");
    } else {
      setMessage(`没收成功：${json.error}`);
    }
    load();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">收藏夹 Agent</h1>
      <p className="mt-1 text-sm opacity-70">把公众号、B 站、网页链接，或小红书、抖音的分享文案丢进来。</p>

      <form onSubmit={save} className="mt-6 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="粘贴链接或分享文案"
          rows={4}
          className="w-full rounded-lg border border-neutral-300 bg-transparent p-3 dark:border-neutral-700"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="为什么存？（可不填）"
          className="w-full rounded-lg border border-neutral-300 bg-transparent p-3 dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={saving || !input.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {saving ? "正在读…" : "收藏"}
        </button>
        {message && <p className="text-sm">{message}</p>}
      </form>

      <ul className="mt-10 space-y-4">
        {items.map((it) => (
          <li key={it.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-xs opacity-60">
              <span>{SOURCE_LABEL[it.source] ?? it.source}</span>
              <span>{new Date(it.created_at).toLocaleString("zh-CN")}</span>
              {it.status === "failed" && <span className="text-red-600">解析失败</span>}
            </div>
            <div className="mt-1 font-medium">
              {it.url ? (
                <a href={it.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {it.title || it.url}
                </a>
              ) : (
                it.title || "（无标题）"
              )}
            </div>
            {it.summary && <p className="mt-2 text-sm opacity-80">{it.summary}</p>}
            {it.status === "failed" && it.error && <p className="mt-2 text-sm text-red-600">{it.error}</p>}
            {it.note && <p className="mt-2 text-sm opacity-60">为什么存：{it.note}</p>}
            {it.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {it.tags.map((t) => (
                  <span key={t} className="rounded bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
