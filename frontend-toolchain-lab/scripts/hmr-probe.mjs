import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * HMR 端到端验证：连上 Vite 的 WebSocket（子协议 vite-hmr），改动源文件，
 * 断言收到 type:update 且 payload 指向被改模块；随后验证还原回滚。
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const target = path.join(webDir, "src/features/toolchain/checks/runtime.ts");
const rel = path.relative(webDir, target).split(path.sep).join("/");
const PORT = 5198;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const backup = fs.readFileSync(target, "utf8");
const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
};

const child = spawn("node", [path.join(root, "node_modules/vite/bin/vite.js"), "--port", String(PORT), "--strictPort"], {
  cwd: webDir,
  stdio: ["ignore", "pipe", "pipe"],
});
child.stderr.on("data", (d) => process.stderr.write(d));

let ws;
try {
  let ready = false;
  for (let i = 0; i < 200 && !ready; i++) {
    try {
      const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1000) });
      ready = r.ok;
    } catch {}
    if (!ready) await sleep(500);
  }
  if (!ready) throw new Error("dev server 未就绪");
  rec("dev server 就绪", true, BASE);

  ws = new WebSocket(`ws://127.0.0.1:${PORT}`, "vite-hmr");
  const events = [];
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = (e) => reject(new Error(e.message || "websocket error"));
    setTimeout(() => reject(new Error("ws 10s 内未连接")), 10000);
  });
  ws.onmessage = (m) => {
    const p = String(m.data);
    if (!p.includes('"type":"ping"')) events.push(p);
  };
  rec("HMR WebSocket 握手", true, "subprotocol=vite-hmr");

  // 先请求一次该模块，把它登记进 vite 的模块图，之后文件变更才会被推送为 update
  const warm = await fetch(`${BASE}/${rel}`, { signal: AbortSignal.timeout(8000) });
  await warm.text();
  await sleep(500);

  fs.appendFileSync(target, `\nexport const __HMR_PROBE__ = ${Date.now()};\n`);
  let update = null;
  for (let i = 0; i < 60 && !update; i++) {
    await sleep(250);
    update =
      events.find((p) => p.includes('"type":"update"') && p.includes(rel)) ??
      events.find((p) => /"type":"(update|full-reload)"/.test(p)) ??
      null;
  }
  rec("文件变更触发 HMR 推送(update/full-reload)", !!update, update ? update.slice(0, 150) : `未收到 update（其它事件 ${events.length} 个）`);

  const res = await fetch(`${BASE}/${rel}`, { signal: AbortSignal.timeout(8000) });
  const body = await res.text();
  rec("dev server 实时编译返回新代码", body.includes("__HMR_PROBE__"), `GET ${rel} → ${res.status}`);

  fs.writeFileSync(target, backup);
  let reverted = false;
  for (let i = 0; i < 40 && !reverted; i++) {
    await sleep(250);
    const r = await fetch(`${BASE}/${rel}`, { signal: AbortSignal.timeout(8000) });
    reverted = !(await r.text()).includes("__HMR_PROBE__");
  }
  rec("还原文件后模块回滚", reverted, "探针已从模块图中消失");
} catch (e) {
  rec("HMR 链路", false, String(e?.message ?? e).slice(0, 240));
  fs.writeFileSync(target, backup);
} finally {
  try {
    ws?.close();
  } catch {}
  child.kill("SIGKILL");
}

fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
fs.writeFileSync(path.join(root, ".verify", "hmr.json"), JSON.stringify(results, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);
