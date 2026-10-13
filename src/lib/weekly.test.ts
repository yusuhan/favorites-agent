import { describe, expect, it } from "vitest";
import { pickWeekly, renderEmail } from "./weekly";
import type { Item } from "./types";

const base = { card_action: "做一下", card_feedback: null, created_at: "2026-10-01T00:00:00Z" } as const;
const mk = (id: string, over: Partial<Item> = {}) => ({ ...base, id, category: "美食" as Item["category"], ...over });

describe("pickWeekly", () => {
  it("跳过最近推过的、做了的和不感兴趣的", () => {
    const items = [mk("a"), mk("b", { card_feedback: "done" }), mk("c", { card_feedback: "dismissed" }), mk("d")];
    expect(pickWeekly(items, new Set(["a"])).map((i) => i.id)).toEqual(["d"]);
  });

  it("有小动作的优先，其次是“以后再说”，再其次是更早存的", () => {
    const items = [
      mk("new", { created_at: "2026-10-05T00:00:00Z", category: "穿搭" }),
      mk("noaction", { card_action: null, created_at: "2026-09-01T00:00:00Z", category: "认知" }),
      mk("later", { card_feedback: "later", created_at: "2026-10-06T00:00:00Z", category: "教程" }),
      mk("old", { created_at: "2026-09-20T00:00:00Z", category: "美食" }),
    ];
    expect(pickWeekly(items, new Set()).map((i) => i.id)).toEqual(["later", "old", "new"]);
  });

  it("先每类一张，不够再用同类补齐", () => {
    const items = [mk("m1", { created_at: "2026-09-01T00:00:00Z" }), mk("m2", { created_at: "2026-09-02T00:00:00Z" }), mk("t1", { category: "教程" })];
    expect(pickWeekly(items, new Set()).map((i) => i.id)).toEqual(["m1", "t1", "m2"]);
  });
});

describe("renderEmail", () => {
  it("转义用户内容", () => {
    const item = { ...mk("x"), title: "<script>", url: null, card_point: "a&b" } as unknown as Item;
    const { html } = renderEmail([item], "https://example.com");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a&amp;b");
    expect(html).not.toContain("<script>");
  });
});
