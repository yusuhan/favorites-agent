"use client";

import { useCallback, useEffect, useState } from "react";
import AskBox from "@/components/AskBox";
import ItemCard from "@/components/ItemCard";
import Login from "@/components/Login";
import SaveBox from "@/components/SaveBox";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Feedback, Item } from "@/lib/types";

export default function Home() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<Item[]>([]);

  const checkUser = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getUser();
    setEmail(data.user?.email ?? null);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/items");
    if (res.ok) setItems((await res.json()).items);
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    if (email) load();
  }, [email, load]);

  async function feedback(id: string, f: Feedback | null) {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, card_feedback: f } : it)));
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: f }),
    });
  }

  async function remove(id: string) {
    if (!confirm("删掉这条收藏？")) return;
    setItems((list) => list.filter((it) => it.id !== id));
    await fetch(`/api/items/${id}`, { method: "DELETE" });
  }

  async function logout() {
    await supabaseBrowser().auth.signOut();
    setEmail(null);
    setItems([]);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">收藏夹 Agent</h1>
        {email && (
          <button onClick={logout} className="text-xs opacity-60 hover:underline">
            {email} · 退出
          </button>
        )}
      </div>
      <p className="mt-1 text-sm opacity-70">把收藏丢进来，它帮你变成现在就能做的一小步。</p>

      {email === null && <Login onDone={checkUser} />}

      {email && (
        <>
          <div className="mt-8">
            <SaveBox onSaved={load} />
          </div>
          <div className="mt-10">
            <AskBox />
          </div>
          <h2 className="mt-12 text-lg font-medium">我的收藏 · {items.filter((i) => i.status === "ok").length}</h2>
          <ul className="mt-4 space-y-4">
            {items.map((it) => (
              <li key={it.id}>
                <ItemCard item={it} onFeedback={(f) => feedback(it.id, f)} onDelete={() => remove(it.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
