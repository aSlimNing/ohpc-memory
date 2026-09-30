/** 共享纯逻辑：验证 workspace 间引用、TS 编译、vitest 直接测试 TS 源码。 */

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

export function makeId(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function createTask(title: string, now = Date.now()): Task {
  return { id: makeId(title + now), title: title.trim(), done: false, createdAt: now };
}

export function toggleTask(task: Task): Task {
  return { ...task, done: !task.done };
}

export function countByStatus(tasks: readonly Task[]): { done: number; open: number } {
  let done = 0;
  for (const t of tasks) if (t.done) done++;
  return { done, open: tasks.length - done };
}

export function formatCurrency(valueCents: number, currency = "CNY", locale = "zh-CN"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(valueCents / 100);
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
