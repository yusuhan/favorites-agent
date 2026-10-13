import { describe, expect, it } from "vitest";
import { splitTitle } from "./vision";

describe("splitTitle", () => {
  it("拆出第一行标题", () => {
    expect(splitTitle("标题：秋季叠穿\n正文一\n画面：灰色卫衣")).toEqual({ title: "秋季叠穿", content: "正文一\n画面：灰色卫衣" });
  });

  it("半角冒号也认", () => {
    expect(splitTitle("标题: 可乐鸡翅\n做法").title).toBe("可乐鸡翅");
  });

  it("没有标题行就整段当正文", () => {
    expect(splitTitle("只有正文")).toEqual({ title: null, content: "只有正文" });
  });
});
