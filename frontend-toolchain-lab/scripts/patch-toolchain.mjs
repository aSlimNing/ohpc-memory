/**
 * 安装后补丁（本机 OHOS 无法执行任何原生 ELF：esbuild 二进制、rollup/swc 的 .node 均被签名策略拒绝 dlopen）
 *  1. esbuild（含所有嵌套副本）→ 替换为 vendor/esbuild-sww（@swc/wasm 兼容层）
 *  2. rollup（含所有嵌套副本）→ 符号链接到官方 WASM 构建 @rollup/wasm-node
 * 必须在 `npm install --ignore-scripts` 之后运行（verify-all install 阶段会自动串联）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shimDir = path.join(root, "vendor/esbuild-sww");

/** 深度遍历，找到所有 node_modules 下名为 pkg 的包目录 */
function findPkgs(dir, pkg, acc = [], depth = 0) {
  if (depth > 8) return acc;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    const p = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name.startsWith("@")) {
      findPkgs(p, pkg, acc, depth + 1);
    } else if (e.name === pkg) {
      if (fs.existsSync(path.join(p, "package.json"))) acc.push(p);
      findPkgs(path.join(p, "node_modules"), pkg, acc, depth + 1);
    }
  }
  return acc;
}

let patched = 0;
for (const esbuild of findPkgs(path.join(root, "node_modules"), "esbuild")) {
  fs.mkdirSync(path.join(esbuild, "lib"), { recursive: true });
  fs.copyFileSync(path.join(shimDir, "main.js"), path.join(esbuild, "lib/main.js"));
  fs.copyFileSync(path.join(shimDir, "shim.mjs"), path.join(esbuild, "shim.mjs"));
  const pkgPath = path.join(esbuild, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.main = "lib/main.js";
  pkg.exports = { ".": { "import": "./shim.mjs", "require": "./lib/main.js", "default": "./lib/main.js" }, "./lib/main.js": "./lib/main.js", "./package.json": "./package.json" };
  delete pkg.bin;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  patched++;
}

const wasmCandidates = findPkgs(path.join(root, "node_modules"), "wasm-node").filter((p) => p.includes("@rollup"));
const wasmPkg = wasmCandidates[0];
if (!wasmPkg) {
  console.error("[patch-toolchain] 缺少 @rollup/wasm-node 依赖");
  process.exit(1);
}

let redirected = 0;
let rollupDirs = findPkgs(path.join(root, "node_modules"), "rollup");
if (!rollupDirs.length) {
  // npm 未安装原生 rollup（平台不匹配）→ 直接提供 WASM 构建作为 `rollup` 包
  fs.symlinkSync(path.relative(path.join(root, "node_modules"), wasmPkg), path.join(root, "node_modules/rollup"), "dir");
  rollupDirs = [path.join(root, "node_modules/rollup")];
  redirected++;
}
for (const rollupDir of rollupDirs) {
  if (fs.lstatSync(rollupDir).isSymbolicLink()) continue;
  const pkg = fs.readFileSync(path.join(rollupDir, "package.json"), "utf8");
  if (pkg.includes("@rollup/wasm-node")) continue;
  fs.rmSync(rollupDir, { recursive: true, force: true });
  fs.symlinkSync(path.relative(path.dirname(rollupDir), wasmPkg), rollupDir, "dir");
  redirected++;
}

console.log(`[patch-toolchain] esbuild shim 注入 ${patched} 处 · rollup → wasm 重定向 ${redirected} 处`);
