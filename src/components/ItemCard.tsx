"use client";

import type { Feedback, Item } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = { wechat: "公众号", bilibili: "B 站", web: "网页", text: "文字", image: "截图" };

const FEEDBACK: { value: Feedback; label: string }[] = [
  { value: "done", label: "做了" },
  { value: "later", label: "以后再说" },
  { value: "dismissed", label: "不感兴趣" },
];

// 一张行动卡：要点 + 小动作 + 原文入口
export default function ItemCard({
  item,
  onFeedback,
  onDelete,
}: {
  item: Item;
  onFeedback?: (f: Feedback | null) => void;
  onDelete?: () => void;
}) {
  if (item.status === "failed") {
    return (
      <div className="card text-sm">
        <div className="text-xs opacity-60">
          {SOURCE_LABEL[item.source] ?? item.source} · 没收成功 · {date(item.created_at)}
        </div>
        <p className="mt-1 break-all">{item.url ?? (item.source === "image" ? "（截图）" : "（文字）")}</p>
        <p className="mt-1 text-red-600">{item.error}</p>
        {onDelete && (
          <button onClick={onDelete} className="mt-2 text-xs underline opacity-60">
            删除
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2 text-xs opacity-60">
        {item.category && <span className="rounded bg-neutral-100 px-1.5 dark:bg-neutral-800">{item.category}</span>}
        <span>{SOURCE_LABEL[item.source] ?? item.source}</span>
        <span>{date(item.created_at)}</span>
      </div>
      <div className="mt-1 font-medium">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
            {item.title || item.url}
          </a>
        ) : (
          item.title || "（无标题）"
        )}
      </div>
      {item.card_point && <p className="mt-2">{item.card_point}</p>}
      {item.card_action && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/40">
          <span className="font-medium">现在就能做：</span>
          {item.card_action}
        </p>
      )}
      {item.note && <p className="mt-2 text-sm opacity-60">为什么存：{item.note}</p>}
      {(onFeedback || onDelete) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {onFeedback &&
            FEEDBACK.map((f) => (
              <button
                key={f.value}
                onClick={() => onFeedback(item.card_feedback === f.value ? null : f.value)}
                className={`rounded-full border px-3 py-0.5 ${
                  item.card_feedback === f.value
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          {onDelete && (
            <button onClick={onDelete} className="ml-auto text-xs underline opacity-50">
              删除
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function date(s: string) {
  return new Date(s).toLocaleDateString("zh-CN");
}
