import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const PORT = 5197;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mock = spawn("node", ["scripts/mock-api.mjs"], { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
const dev = spawn("node", [path.join(root, "node_modules/vite/bin/vite.js")].concat(["--port", String(PORT), "--strictPort"]), { cwd: webDir, stdio: ["ignore", "pipe", "pipe"] });
dev.stderr.on("data", (d) => process.stderr.write(d));

const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
};

try {
  for (let i = 0; i < 150; i++) {
    try {
      const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1000) });
      if (r.ok) break;
    } catch {}
    await sleep(400);
    if (i === 149) throw new Error("dev server 未就绪");
  }

  const get = await fetch(`${BASE}/api/tasks?_limit=3`, { signal: AbortSignal.timeout(8000) });
  const list = await get.json();
  rec("vite proxy GET", get.status === 200 && list.length === 3, `GET /api/tasks → ${get.status}, ${list.length} 条`);

  const post = await fetch(`${BASE}/api/echo`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-lab-client": "probe" },
    body: JSON.stringify({ hello: 1 }),
    signal: AbortSignal.timeout(8000),
  });
  const echoed = await post.json();
  rec("vite proxy POST+header", post.status === 200 && echoed.client === "probe", `echo=${echoed.got}`);
} catch (e) {
  rec("proxy 链路", false, String(e?.message ?? e).slice(0, 200));
} finally {
  dev.kill("SIGKILL");
  mock.kill("SIGKILL");
}

fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
fs.writeFileSync(path.join(root, ".verify", "proxy.json"), JSON.stringify(results, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);
