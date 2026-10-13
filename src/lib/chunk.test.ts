import { describe, expect, it } from "vitest";
import { chunkText, splitBatch } from "./chunk";

describe("chunkText", () => {
  it("短文本不切", () => {
    expect(chunkText("第一段\n第二段")).toEqual(["第一段\n第二段"]);
  });

  it("按段落合并到上限再切", () => {
    const a = "甲".repeat(300);
    const b = "乙".repeat(300);
    expect(chunkText(`${a}\n${b}`)).toEqual([a, b]);
  });

  it("超长段落硬切并保留重叠", () => {
    const long = "字".repeat(1200);
    const out = chunkText(long, 500, 50);
    expect(out.length).toBe(3);
    expect(out.every((c) => c.length <= 500)).toBe(true);
  });

  it("空文本返回空", () => {
    expect(chunkText("\n \n")).toEqual([]);
  });
});

describe("splitBatch", () => {
  it("一条链接或纯文字整段保留", () => {
    const xhs = "好看的穿搭 http://xhslink.com/a1 复制本条信息";
    expect(splitBatch(xhs)).toEqual([xhs]);
    expect(splitBatch("  一段话  ")).toEqual(["一段话"]);
  });

  it("多条链接拆开并去重", () => {
    const input = "https://a.com/1\nhttps://b.com/2 https://a.com/1";
    expect(splitBatch(input)).toEqual(["https://a.com/1", "https://b.com/2"]);
  });
});
