"use client";

import { useState } from "react";

type Source = { n: number; item_id: string; title: string; url: string | null };

// 问答：只用自己的收藏回答，带出处
export default function AskBox() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ text: string | null; sources: Source[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    setAnswer(null);
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    setBusy(false);
    if (res.ok) setAnswer({ text: json.answer, sources: json.sources });
    else setMsg(json.error);
  }

  return (
    <section>
      <form onSubmit={ask} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="问问你的收藏，比如：周末做什么菜" className="input" />
        <button type="submit" disabled={busy || !q.trim()} className="btn shrink-0">
          {busy ? "找…" : "问"}
        </button>
      </form>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
      {answer && (
        <div className="card mt-3">
          {answer.text ? (
            <>
              <p className="whitespace-pre-wrap">{answer.text}</p>
              <ul className="mt-3 space-y-1 text-sm opacity-70">
                {answer.sources.map((s) => (
                  <li key={s.n}>
                    [{s.n}]{" "}
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                        {s.title}
                      </a>
                    ) : (
                      s.title
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>你的收藏里没找到能回答这个问题的内容。</p>
          )}
        </div>
      )}
    </section>
  );
}
