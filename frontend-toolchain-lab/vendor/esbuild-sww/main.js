"use strict";
/**
 * esbuild 兼容层（本机 OHOS 无法执行原生 esbuild ELF）
 *  - build / context：委托官方 `esbuild-wasm`（真 bundler，Vite dev 依赖预打包必需）
 *  - transformSync：用 @swc/wasm（esbuild-wasm 没有同步 transform API）
 *  - esbuild-wasm 缺失时 build 退化为「单文件 + define 替换」，只够加载 vite 配置文件
 */
let swc = null;
for (const name of ["@swc/wasm", "@swc/core"]) {
  try {
    swc = require(name);
    break;
  } catch {}
}

const path = require("node:path");
const { createRequire } = require("node:module");

const rootDir = path.resolve(__dirname, "../../..");

let esw = null;
try {
  esw = require("esbuild-wasm");
} catch {}

const LOADER_LANG = { ts: "typescript", tsx: "typescript", js: "ecmascript", jsx: "ecmascript" };

function toSwcOptions(opts = {}) {
  const lang = LOADER_LANG[opts.loader];
  return {
    filename: opts.sourcefile || opts.source || "input",
    sourceMaps: opts.sourcemap === "both" ? "inline" : !!opts.sourcemap,
    inlineSourcesContent: true,
    isModule: true,
    module: { type: opts.format === "iife" ? "commonjs" : "es6" },
    jsc: {
      target: "es2022",
      parser: lang ? { syntax: lang, tsx: opts.loader === "tsx", decorators: true } : { syntax: "typescript", decorators: true },
      transform: {
        react: { runtime: "automatic", importSource: opts.jsxImportSource || "react", development: !!opts.jsxDev },
        useDefineForClassFields: true,
      },
    },
  };
}

function wrap(code, map, opts = {}) {
  let m = map || undefined;
  if (!m && opts.sourcemap) {
    m = JSON.stringify({ version: 3, sources: [opts.sourcefile || opts.source || "input"], mappings: "" });
  }
  return { code, map: m, warnings: [], mangleMeta: undefined };
}

/**
 * esbuild `define` 文本替换，两个必须对齐的细节：
 *  - 长键优先（process.env.NODE_ENV 先于 process.env）
 *  - 对象/数组字面量加括号，否则 `{}` 落在语句开头会被解析成语句块
 */
function applyDefines(src, define) {
  for (const [key, rawValue] of Object.entries(define || {}).sort((a, b) => b[0].length - a[0].length)) {
    const value = /^\s*[[{]/.test(String(rawValue)) ? `(${rawValue})` : String(rawValue);
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    src = src.replace(new RegExp(`(?<![\\w$.])${esc}(?![\\w$])`, "g"), () => value);
  }
  return src;
}

function transformSync(input, opts = {}) {
  if (!swc) throw new Error("[esbuild-sww] 需要 @swc/wasm 提供同步 transform");
  let src = applyDefines(String(input), opts.define);
  if (opts.minify) {
    const out = swc.minifySync(src, { compress: true, mangle: true, code: true, module: true });
    return wrap(out.code, out.map, opts);
  }
  // 纯 JS/JSX/CSS：swc-wasm 对部分第三方产物解析受限 → 只做 define 替换后透传
  if (opts.loader === "js" || opts.loader === "jsx" || opts.loader === "css" || !LOADER_LANG[opts.loader]) {
    return wrap(src, undefined, opts);
  }
  const out = swc.transformSync(src, toSwcOptions(opts));
  return wrap(out.code, out.map, opts);
}

function transform(input, opts = {}) {
  if (esw) return esw.transform(input, opts);
  return Promise.resolve(transformSync(input, opts));
}

function passthroughBuild(opts) {
  let text;
  let outfile = opts.outfile || "output.js";
  if (opts.stdin && opts.stdin.contents != null) {
    text = String(opts.stdin.contents);
    outfile = (opts.stdin.sourcefile || outfile).replace(/\.[mc]?[jt]sx?$/, ".js");
  } else {
    const entry = Array.isArray(opts.entryPoints) ? opts.entryPoints[0] : opts.entryPoints;
    if (typeof entry !== "string") throw new Error("[esbuild-sww] build: 不支持的 entryPoints");
    const fs = require("node:fs");
    const src = fs.readFileSync(entry, "utf8");
    text = /\.tsx?$/.test(entry) ? swc.transformSync(src, toSwcOptions({ loader: entry.endsWith(".tsx") ? "tsx" : "ts", sourcefile: entry })).code : src;
  }
  text = applyDefines(text, opts.define);
  if (opts.banner?.js) text = opts.banner.js + "\n" + text;
  const metafile = { inputs: {}, outputs: { [outfile]: { bytes: text.length, imports: [], exports: [] } } };
  return { outputFiles: opts.write ? [] : [{ path: outfile, text }], metafile };
}

/** esbuild-wasm 与原生 esbuild 的一处差异：entryPoint 同时出现在 external 会直接报错，原生只是忽略 */
/**
 * esbuild-wasm 比原生 esbuild 严格：入口点字符串若同时出现在 external 中会直接报错，
 * 而 Vite 依赖预打包正是「entryPoints: ["react", ...] + external: [...]」这种形态。
 * 处理：把扁平 id 入口转成 record 形式 { "<id>.js": 绝对路径 }，
 * 产物名与 Vite 期望一致，且入口不再与 external 同名。
 */
function reconcileOptimizerRun(opts) {
  if (!Array.isArray(opts.external) || !Array.isArray(opts.entryPoints) || !opts.outdir) return opts;
  const cwd = opts.absWorkingDir || rootDir;
  const req = createRequire(path.join(cwd, "noop.js"));
  const record = {};
  let changed = false;
  for (const id of opts.entryPoints) {
    if (typeof id !== "string") return opts;
    let file = id;
    try {
      file = req.resolve(id, { paths: [cwd] });
    } catch {
      // 扁平化 id（react_jsx-dev-runtime 等）由 Vite 的 onResolve 插件处理，原样保留
    }
    record[id] = file;
    changed = true;
  }
  if (!changed) return opts;
  const inputs = new Set(Object.values(record));
  const external = opts.external.filter((x) => !record[x] && !inputs.has(x) && !String(x).includes("*"));
  return { ...opts, entryPoints: record, external };
}

function build(opts = {}) {
  if (esw) return Promise.resolve(esw.build(reconcileOptimizerRun(opts)));
  return Promise.resolve(passthroughBuild(opts));
}

function context(opts = {}) {
  if (!esw) {
    return Promise.resolve({
      read: () => Promise.resolve({ outputFiles: [], metafile: { inputs: {}, outputs: {} } }),
      rebuild: () => Promise.resolve({ outputFiles: [], metafile: { inputs: {}, outputs: {} } }),
      cancel: () => Promise.resolve(),
      dispose: () => Promise.resolve(),
      keepNames: () => Promise.resolve(),
      hosts: {},
      port: 0,
    });
  }
  let last = reconcileOptimizerRun(opts);
  return esw.context(last).then((ctx) => {
    if (typeof ctx.update === "function") {
      const raw = ctx.update.bind(ctx);
      ctx.update = (next) => {
        last = reconcileOptimizerRun({ ...last, ...next });
        return raw(last);
      };
    }
    const rawRebuild = ctx.rebuild && ctx.rebuild.bind(ctx);
    if (rawRebuild) ctx.rebuild = () => rawRebuild();
    return ctx;
  });
}

function buildSync(opts) {
  if (esw) return esw.buildSync(opts);
  throw new Error("[esbuild-sww] buildSync 需要 esbuild-wasm");
}

function contextSync(opts) {
  if (esw) return esw.contextSync(opts);
  throw new Error("[esbuild-sww] contextSync 需要 esbuild-wasm");
}

const metaText = (m) => (typeof m === "string" ? m : JSON.stringify(m ?? {}, null, 2));

module.exports = {
  transform,
  transformSync,
  build,
  buildSync,
  context,
  contextSync,
  analyzeMetafile: esw?.analyzeMetafile ?? (async (m) => metaText(m)),
  analyzeMetafileSync: esw?.analyzeMetafileSync ?? metaText,
  formatMessages: esw?.formatMessages ?? (async (m) => m.map((x) => x.text)),
  formatMessagesSync: esw?.formatMessagesSync ?? ((m) => m.map((x) => x.text)),
  initialize: () => Promise.resolve(),
  version: esw ? `${esw.version}-sww` : "0.25.12-sww",
  __backends: () => ({ esbuildWasm: !!esw, swc: !!swc }),
};
