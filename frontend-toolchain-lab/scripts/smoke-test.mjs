import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps/web");
const mode = process.argv[2] ?? "dev"; // dev | preview
const PORT = mode === "dev" ? 5199 : 4178;
const BASE = `http://127.0.0.1:${PORT}`;

const log = (m) => console.log(`[smoke:${mode}] ${m}`);

function startServer() {
  const args = mode === "dev" ? ["--port", String(PORT), "--strictPort"] : ["preview", "--port", String(PORT), "--strictPort"];
  const child = spawn("node", [path.join(webDir, "../../node_modules/vite/bin/vite.js")].concat(args), { cwd: webDir, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  child.stdout.on("data", (d) => log(`(server) ${String(d).trim()}`));
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      log(`服务进程退出 code=${code}\n${stderr.slice(0, 800)}`);
    }
  });
  return child;
}

async function waitForHttp(url, timeoutMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return r;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`等待 ${url} 超时 (${timeoutMs}ms)`);
}

async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  return { status: r.status, body: await r.text(), headers: Object.fromEntries(r.headers) };
}

const checks = [];
const expect = (name, ok, detail) => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
};

let child;
try {
  if (mode === "preview" && !fs.existsSync(path.join(webDir, "dist/index.html"))) {
    throw new Error("dist/ 不存在，请先运行 build");
  }
  child = startServer();
  await waitForHttp(`${BASE}/`);
  log("服务已就绪");

  const index = await get(`${BASE}/`);
  expect("index.html 200", index.status === 200, `status=${index.status}, ${index.body.length}B`);
  expect("包含 #root 挂载点", index.body.includes('id="root"'), "HTML 结构正确");

  if (mode === "dev") {
    const main = await get(`${BASE}/src/main.tsx`);
    expect("TSX 按需编译", main.status === 200 && main.body.includes("createRoot"), `transform 输出 ${main.body.length}B`);
    const hmr = await get(`${BASE}/@vite/client`);
    expect("HMR 客户端模块", hmr.status === 200 && hmr.body.includes("hot"), "/@vite/client 可加载");
    const css = await get(`${BASE}/src/index.css`);
    expect("Tailwind/PostCSS 管道", css.status === 200 && (css.body.includes("--tw-") || css.body.toLowerCase().includes("tailwind") || css.body.includes(".mx-auto")), `css 模块 ${css.body.length}B`);
    const scss = await get(`${BASE}/src/styles.module.scss`);
    expect("Sass + CSS Modules", scss.status === 200 && /moduleCard/.test(scss.body), "scss module 编译出作用域类名");
    const shared = await get(`${BASE}/@fs/${path.join(webDir, "../../packages/shared/src/index.ts")}`);
    expect("跨 workspace 源码解析", shared.status === 200 && shared.body.includes("createTask"), `shared 包源码经 vite 解析 OK (${shared.body.length}B)`);
  } else {
    const m = index.body.match(/src="([^"]+\.js)"/);
    if (!m) throw new Error("index.html 未引用打包后的 js");
    const assetUrl = new URL(m[1], BASE).href;
    const asset = await get(assetUrl);
    expect("生产 JS 产物可服务", asset.status === 200 && asset.body.length > 1000, `${m[1]} → ${asset.body.length}B`);
    expect("内容 hash 命名", /-[A-Za-z0-9_-]{6,12}\.js$/.test(m[1]), m[1]);
    const mapUrl = assetUrl + ".map";
    try {
      const map = await get(mapUrl);
      const json = JSON.parse(map.body);
      expect("sourcemap 产物", map.status === 200 && Array.isArray(json.sources), `sources=${json.sources.length} files`);
    } catch (e) {
      expect("sourcemap 产物", false, String(e.message));
    }
    const cssRef = index.body.match(/href="([^"]+\.css)"/);
    if (cssRef) {
      const css = await get(new URL(cssRef[1], BASE).href);
      expect("生产 CSS 产物", css.status === 200 && css.body.length > 500, `${cssRef[1]} → ${css.body.length}B`);
      expect("Tailwind 工具类已进产物", /\.mx-auto|,\.\w/.test(css.body) || css.body.includes("--tw"), "utilities 存在");
    } else {
      expect("生产 CSS 产物", false, "index.html 无 css 引用");
    }
    expect("HTML 中资源为相对 base", m[1].startsWith("/"), m[1]);
  }
} catch (e) {
  expect(mode === "dev" ? "dev 服务器" : "preview 服务器", false, String(e?.message ?? e).slice(0, 300));
} finally {
  child?.kill("SIGKILL");
}

const fails = checks.filter((c) => !c.ok);
console.log(`== smoke:${mode} 结果 ${checks.length - fails.length}/${checks.length} 通过 ==`);
fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
fs.writeFileSync(path.join(root, ".verify", `smoke-${mode}.json`), JSON.stringify(checks, null, 2));
process.exit(fails.length ? 1 : 0);
