import { useCallback, useRef, useState } from "react";
import { allChecks, type CheckResult } from "./checks";
import styles from "../../styles.module.scss";

type Phase = "idle" | "running" | "done";

export default function ToolchainPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<CheckResult[]>([]);
  const runningRef = useRef(false);

  const runAll = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    setResults([]);
    const collected: CheckResult[] = [];
    for (const check of allChecks) {
      const t0 = performance.now();
      let result: CheckResult;
      try {
        const detail = await check.run();
        result = { id: check.id, title: check.title, status: "pass", detail, ms: Math.round(performance.now() - t0) };
      } catch (err) {
        result = {
          id: check.id,
          title: check.title,
          status: "fail",
          detail: err instanceof Error ? err.message : String(err),
          ms: Math.round(performance.now() - t0),
        };
      }
      collected.push(result);
      setResults([...collected]);
    }
    (window as { __LAB_RESULTS__?: CheckResult[] }).__LAB_RESULTS__ = collected;
    try {
      localStorage.setItem("lab-results", JSON.stringify(collected));
    } catch {
      /* 存储不可用时忽略 */
    }
    setPhase("done");
    runningRef.current = false;
  }, []);

  const pass = results.filter((r) => r.status === "pass").length;

  return (
    <div className={styles.moduleCard}>
      <h3>浏览器运行时能力自检（{allChecks.length} 项）</h3>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={runAll}
          disabled={phase === "running"}
        >
          {phase === "running" ? "检测中…" : phase === "done" ? "重新检测" : "开始检测"}
        </button>
        {phase === "done" && (
          <span className="text-sm">
            通过 <strong className="text-emerald-600">{pass}</strong> / {results.length}
          </span>
        )}
      </div>
      <span className={styles.meta}>结果同时写入 localStorage 与 window.__LAB_RESULTS__，供外部工具读取。</span>
      <ul className="mt-3 list-none space-y-2 p-0 text-sm">
        {results.map((r) => (
          <li key={r.id} data-testid={`check-${r.id}`} className="rounded border border-gray-200 p-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              <strong>{r.title}</strong>
              <span className={styles.meta}>{r.ms}ms</span>
            </div>
            <p className="mt-1 break-all text-gray-600">{r.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: CheckResult["status"] }) {
  const cls =
    status === "pass"
      ? "bg-emerald-100 text-emerald-700"
      : status === "fail"
        ? "bg-red-100 text-red-700"
        : "bg-gray-200 text-gray-600";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {status === "pass" ? "通过" : status === "fail" ? "失败" : "跳过"}
    </span>
  );
}
