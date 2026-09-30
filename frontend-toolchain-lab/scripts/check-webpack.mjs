import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);
const bundlePath = path.join(root, ".verify/webpack/bundle.cjs");
const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
};

try {
  const out = execFileSync(
    "node",
    [path.join(root, "node_modules/webpack-cli/bin/cli.js"), "--config", path.join(root, "toolchecks/webpack/webpack.config.cjs")],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300_000 }
  );
  const statsLine = out.split("\n").filter((l) => /compiled|bundle\.cjs/.test(l)).join(" | ").slice(0, 200);
  rec("webpack 编译", /compiled successfully|webpack \d/.test(out) || fs.existsSync(bundlePath), statsLine || "无输出");

  const size = fs.statSync(bundlePath).size;
  rec("webpack 产物", size > 200, `${(size / 1024).toFixed(1)}KB`);

  const { report } = req(bundlePath);
  const parsed = JSON.parse(report());
  rec("bundle 可执行", typeof report === "function", `id=${parsed.id}`);
  rec("webpack 内 Sass 编译", parsed.sassCompiled === true, `css 含 $primary 解析结果=${parsed.sassCompiled}`);
  rec("webpack 内 CSS Modules 作用域类名", parsed.scopedInCss === true || parsed.localKeys.includes("app"), `locals=[${parsed.localKeys}] scoped=${parsed.scopedInCss}`);
  rec("webpack 内跨包 TS 解析", parsed.slug === "webpack-pipeline", parsed.slug);
  rec("webpack 内共享逻辑正确", parsed.stats.open === 1 && parsed.stats.done === 0, JSON.stringify(parsed.stats));
} catch (e) {
  rec("webpack 管线", false, String(e?.message ?? e).split("\n").slice(0, 4).join(" / ").slice(0, 400));
}

fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
fs.writeFileSync(path.join(root, ".verify", "webpack.json"), JSON.stringify(results, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);
