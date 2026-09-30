import { describe, expect, it } from "vitest";
import {
  countByStatus,
  createTask,
  formatCurrency,
  makeId,
  slugify,
  toggleTask,
} from "@lab/shared";

describe("@lab/shared 纯逻辑（workspace 引用 + TS 源码直连）", () => {
  it("makeId 稳定且 URL 安全", () => {
    expect(makeId("abc")).toBe(makeId("abc"));
    expect(makeId("abc")).toMatch(/^[0-9a-z]+$/);
    expect(makeId("abc")).not.toBe(makeId("abd"));
  });

  it("createTask 去空格并标记未完成", () => {
    const t = createTask("  写周报  ", 1700000000000);
    expect(t.title).toBe("写周报");
    expect(t.done).toBe(false);
    expect(t.createdAt).toBe(1700000000000);
  });

  it("toggleTask 不可变更新", () => {
    const t = createTask("x", 1);
    const next = toggleTask(t);
    expect(next.done).toBe(true);
    expect(t.done).toBe(false);
  });

  it("countByStatus 统计", () => {
    const tasks = [
      { ...createTask("a", 1), done: true },
      createTask("b", 2),
      createTask("c", 3),
    ];
    expect(countByStatus(tasks)).toEqual({ done: 1, open: 2 });
  });

  it("formatCurrency 使用 Intl", () => {
    expect(formatCurrency(12345)).toContain("123.45");
  });

  it("slugify 保留中文与字母数字", () => {
    expect(slugify("Hello World!!")).toBe("hello-world");
    expect(slugify("前端 工具链 v2")).toBe("前端-工具链-v2");
  });
});
