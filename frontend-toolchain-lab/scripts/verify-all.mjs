import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const only = process.argv.slice(2); // 可选：只跑某些阶段 id

const stages = [
  { id: "install", name: "依赖安装 (npm install --ignore-scripts, workspaces)", cmd: ["install", "--ignore-scripts"], cwd: root, timeout: 900_000 },
  { id: "lock", name: "锁文件一致性 (npm ci --dry-run, 会在 patch 前执行)", cmd: ["ci", "--dry-run"], cwd: root, timeout: 300_000 },
  { id: "patch", name: "工具链适配 (esbuild→swc-wasm shim, rollup→wasm)", cmd: ["node", "scripts/patch-toolchain.mjs"], cwd: root, timeout: 120_000 },
  { id: "env", name: "环境探测 (node/esbuild/sass/tsc/网络/watch)", cmd: ["node", "scripts/check-env.mjs"], cwd: root, timeout: 120_000 },
  { id: "native", name: "原生模块编译 (better-sqlite3, 可选能力)", cmd: ["node", "scripts/check-native.mjs"], cwd: root, timeout: 600_000, allowFail: true },
  { id: "webpack", name: "第二条打包管线 (webpack 5 + ts-loader + sass-loader)", cmd: ["node", "scripts/check-webpack.mjs"], cwd: root, timeout: 420_000, allowFail: true },
  { id: "lint", name: "代码检查 (ESLint 9 flat config)", cmd: ["run", "lint", "--workspace", "@lab/web"], cwd: root, timeout: 300_000 },
  { id: "typecheck", name: "类型检查 (tsc --noEmit, 全部 workspace)", cmd: ["run", "typecheck", "--workspaces"], cwd: root, timeout: 300_000 },
  { id: "test", name: "单元测试 (vitest + jsdom + testing-library)", cmd: ["run", "test", "--workspace", "@lab/web"], cwd: root, timeout: 600_000 },
  { id: "dev-smoke", name: "开发服务器冒烟 (vite dev + 模块管道)", cmd: ["node", "scripts/smoke-test.mjs", "dev"], cwd: root, timeout: 300_000 },
  { id: "hmr", name: "HMR 热更新 (fs.watch → WS 推送 + transform 实时更新)", cmd: ["node", "scripts/hmr-probe.mjs"], cwd: root, timeout: 300_000 },
  { id: "proxy", name: "API 代理链路 (mock server + vite proxy + axios 头)", cmd: ["node", "scripts/verify-proxy.mjs"], cwd: root, timeout: 300_000 },
  { id: "build", name: "生产构建 (tsc -b + vite build/rollup + hash + sourcemap)", cmd: ["run", "build", "--workspace", "@lab/web"], cwd: root, timeout: 600_000 },
  { id: "artifacts", name: "产物校验 (分割/压缩/CSS/sourcemap)", cmd: ["node", "scripts/verify-artifacts.mjs"], cwd: root, timeout: 120_000 },
  { id: "preview-smoke", name: "预览服务器冒烟 (vite preview 静态服务)", cmd: ["node", "scripts/smoke-test.mjs", "preview"], cwd: root, timeout: 180_000 },
];

function runStage(stage) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const [exe, ...rest] = stage.cmd;
    const child = spawn(exe === "node" ? process.execPath : "npm", exe === "node" ? rest : stage.cmd, {
      cwd: stage.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    let tail = "";
    const absorb = (d) => {
      const s = String(d);
      process.stdout.write(s);
      tail = (tail + s).slice(-4000);
    };
    child.stdout.on("data", absorb);
    child.stderr.on("data", absorb);
    const timer = setTimeout(() => child.kill("SIGKILL"), stage.timeout);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ id: stage.id, name: stage.name, code, ms: Date.now() - t0, tail });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ id: stage.id, name: stage.name, code: -1, ms: Date.now() - t0, tail: String(e) });
    });
  });
}

fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
const summary = [];
let aborted = false;

for (const stage of stages) {
  if (only.length && !only.includes(stage.id)) continue;
  console.log(`\n━━━━━━ [${stage.id}] ${stage.name} ━━━━━━`);
  const r = await runStage(stage);
  const ok = r.code === 0;
  const softFail = stage.allowFail && !ok;
  r.status = ok ? "PASS" : softFail ? "WARN" : "FAIL";
  console.log(`[${stage.id}] → ${r.status} (${(r.ms / 1000).toFixed(1)}s)`);
  // 任何改动依赖树的动作都会清掉手工注入的 shim / rollup 符号链接 → 重新打补丁
  if (["install", "lock", "native", "webpack"].includes(stage.id)) {
    execFileSync(process.execPath, ["scripts/patch-toolchain.mjs"], { cwd: root, stdio: "ignore", timeout: 120_000 });
  }
  summary.push({ id: r.id, name: r.name, status: r.status, seconds: +(r.ms / 1000).toFixed(1) });
  if (!ok && !softFail) {
    aborted = true;
    break;
  }
}

console.log("\n══════════════ 工具链验证总览 ══════════════");
for (const s of summary) console.log(`${s.status.padEnd(4)} ${String(s.id).padEnd(15)} ${s.seconds}s  ${s.name}`);
const executed = summary.length;
const passed = summary.filter((s) => s.status === "PASS").length;
const warned = summary.filter((s) => s.status === "WARN").length;
console.log(`执行 ${executed}/${stages.length} 阶段 · PASS ${passed} · WARN ${warned} · ${aborted ? "有阶段失败，提前中止" : "全部执行完毕"}`);
fs.writeFileSync(path.join(root, ".verify", "summary.json"), JSON.stringify({ at: new Date().toISOString(), summary, aborted }, null, 2));
process.exit(aborted ? 1 : 0);
