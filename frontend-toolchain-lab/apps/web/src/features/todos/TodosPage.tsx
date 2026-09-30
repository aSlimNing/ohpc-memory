import { useState } from "react";
import { countByStatus, formatCurrency } from "@lab/shared";
import { useTaskStore } from "./store";
import { fetchServerTasks, type ServerTask } from "./api";
import styles from "../../styles.module.scss";

export default function TodosPage() {
  const { tasks, add, toggle, clear } = useTaskStore();
  const [draft, setDraft] = useState("");
  const [server, setServer] = useState<{ state: "idle" | "loading" | "ok" | "err"; data?: ServerTask[]; msg?: string }>({
    state: "idle",
  });

  const stats = countByStatus(tasks);

  return (
    <div className="flex flex-col gap-4">
      <section className={styles.moduleCard}>
        <h3>本地状态（zustand + persist）</h3>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
        >
          <input
            aria-label="新任务"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="输入任务…"
          />
          <button className="rounded bg-indigo-600 px-3 py-1 text-sm text-white" type="submit">
            添加
          </button>
        </form>
        <ul className="mt-3 list-none space-y-1 p-0 text-sm" aria-label="任务列表">
          {tasks.map((t) => (
            <li key={t.id}>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                <span className={t.done ? "line-through text-gray-400" : ""}>{t.title}</span>
              </label>
            </li>
          ))}
          {tasks.length === 0 && <li className="text-gray-400">暂无任务</li>}
        </ul>
        <div className={styles.meta}>
          完成 {stats.done} / {tasks.length} · 示例金额 {formatCurrency(8888)}
        </div>
        <button className="mt-2 text-xs underline" onClick={clear} type="button">
          清空
        </button>
      </section>

      <section className={styles.moduleCard}>
        <h3>远程请求（axios + dev proxy）</h3>
        <button
          className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
          type="button"
          disabled={server.state === "loading"}
          onClick={async () => {
            setServer({ state: "loading" });
            try {
              const data = await fetchServerTasks();
              setServer({ state: "ok", data });
            } catch (err) {
              setServer({ state: "err", msg: err instanceof Error ? err.message : String(err) });
            }
          }}
        >
          {server.state === "loading" ? "请求中…" : "请求 /api/tasks"}
        </button>
        {server.state === "err" && <p className="mt-2 text-sm text-red-600">{server.msg}</p>}
        <ul className="mt-2 list-none space-y-1 p-0 text-sm">
          {server.data?.map((t) => (
            <li key={t.id}>
              #{t.id} {t.title} {t.completed ? "✓" : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
