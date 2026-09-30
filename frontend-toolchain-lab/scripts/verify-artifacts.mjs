import { gzipSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "apps/web/dist");
const assets = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else assets.push(p);
  }
})(dist);

const js = assets.filter((a) => a.endsWith(".js") && !a.endsWith(".map"));
const css = assets.filter((a) => a.endsWith(".css"));
const maps = assets.filter((a) => a.endsWith(".map"));
const other = assets.filter((a) => !a.endsWith(".js") && !a.endsWith(".css") && !a.endsWith(".map"));

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
const fmt = (f) => {
  const raw = fs.statSync(f).size;
  return `${path.relative(dist, f)} raw=${kb(raw)} gzip=${kb(gzipSync(fs.readFileSync(f)).length)}`;
};

const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
};

rec("产物文件数", assets.length >= 4, `js=${js.length} css=${css.length} map=${maps.length} 其他=${other.length}`);
rec("代码分割 manualChunks", js.some((f) => path.basename(f).startsWith("react")) && js.length >= 2, js.map((f) => path.basename(f)).join(", "));
rec("JS 产物已压缩", js.every((f) => fs.readFileSync(f, "utf8").length / 1024 < 400), js.map(fmt).join(" | "));
rec("Sass 编译进 CSS", css.some((f) => /moduleCard/.test(fs.readFileSync(f, "utf8"))), css.map(fmt).join(" | "));
rec("Tailwind 工具类进 CSS", css.some((f) => /\.mx-auto|,\.\w/.test(fs.readFileSync(f, "utf8"))), "utilities 已生成");
rec("sourcemap 完整", maps.length >= js.length + css.length, `${maps.length} 个 map`);
rec("静态资源引用", other.length >= 0, other.map((f) => path.basename(f)).join(", ") || "无额外资源");

const total = assets.reduce((n, f) => n + fs.statSync(f).size, 0);
const totalGz = assets.reduce((n, f) => n + (f.endsWith(".map") ? 0 : gzipSync(fs.readFileSync(f)).length), 0);
console.log(`\n产物总量 raw=${kb(total)} gzip(不含map)=${kb(totalGz)}`);

fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
fs.writeFileSync(path.join(root, ".verify", "artifacts.json"), JSON.stringify({ results, assets: assets.map((f) => fmt(f)), total }, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);
