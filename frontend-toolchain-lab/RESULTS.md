# 验证结果（2026-09-28 实机运行，全部为真实执行输出）

设备：HarmonyOS PC（HongMeng Kernel 1.13.0, arm64, 20 核 / 31.2GB）
运行时：node v24.11.1（`process.platform = "ohos"`）· npm 11.19.1
一键复现：`npm install --ignore-scripts && node scripts/patch-toolchain.mjs && npm run verify`

## 一、`npm run verify` 总览（15/15 阶段全部执行）

```
PASS  install         依赖安装 (npm install --ignore-scripts, workspaces)
PASS  lock            锁文件一致性 (npm ci --dry-run)
PASS  patch           工具链适配 (esbuild→swc-wasm/esbuild-wasm shim, rollup→wasm)
PASS  env             环境探测 (node/esbuild/sass/tsc/网络/watch)  → 11/11 项
WARN  native          原生模块编译 (better-sqlite3)               → 唯一未通过项
PASS  webpack         第二条打包管线 (webpack 5 + ts-loader + sass-loader) → 7/7
PASS  lint            ESLint 9 flat config + typescript-eslint
PASS  typecheck       tsc 5.9 工程引用 (tsc -b)
PASS  test            Vitest 3 + jsdom + Testing Library          → 10/10 用例
PASS  dev-smoke       vite dev 服务器 + 模块管道                  → 7/7
PASS  hmr             HMR (fs.watch → WebSocket 推送 → transform 实时更新) → 5/5
PASS  proxy           mock server + vite proxy + axios 自定义头
PASS  build           tsc -b + vite build (rollup-wasm + esbuild-wasm 压缩) → 12s
PASS  artifacts       产物校验（分包/压缩/CSS/sourcemap）         → 7/7
PASS  preview-smoke   vite preview 静态服务                       → 8/8
```

产物实测：`index.js` 65.6KB(gzip 26.1KB) + `react.js` 160.6KB(gzip 52.6KB) 双 chunk、CSS 8.3KB、3 个 sourcemap（sources=72）。

## 二、真浏览器运行时自检（11/11 通过）

`vite preview` 服务生产产物，浏览器打开 `/` 点“开始检测”，实测：

| 检测项 | 结果 | 实测数据 |
|---|---|---|
| 运行环境识别 | 通过 | Chromium 内核 / UA Linux x86_64 伪装 |
| 国际化 Intl | 通过 | `¥12,345.60`、`2026年9月28日星期一`、中文排序 |
| JIT 吞吐 | 通过 | 3M 循环 40ms、JSON 400KB 序列化+解析 48ms |
| WebGL | 通过 | WebGL 2.0 (OpenGL ES 3.0 Chromium) · **renderer=Maleoon 916** |
| Web Crypto | 通过 | SHA-256 + AES-GCM 加解密 |
| 渲染帧驱动 rAF | 通过 | 后台窗口 rAF=0 帧，由定时器补 6 帧（隐藏页面节流，非设备缺陷） |
| Web Worker | 通过 | Vite `?worker&inline` 打包后 roundtrip 正常 |
| 存储 | 通过 | localStorage + IndexedDB 建库/写读 |
| 同源 fetch | 通过 | `GET /` → 200 in 14ms |
| 跨源 CORS | 通过 | jsdelivr `ACAO:*` 读取 `react@18.3.1/package.json` |
| 定时器精度 | 通过 | 3×100ms setInterval 全触发 |

补充：`example.com` 在浏览器侧 fetch 失败但 curl 可达 → 浏览器网络白名单/代理策略限制，已改用带 ACAO 的 CDN 验证。

## 三、浏览器内 HMR 实测（人工驱动 CDP）

在 `vite dev` 页面上：先在 window 上打标记 → 改 `App.tsx` 标题文本 → 页面 DOM 标题实时变更，且 `window.__hmrMark` 仍然存在 → **React Fast Refresh 生效、未整页刷新**。

## 四、这台设备做前端的关键约束与解法（本项目全部落地）

| 约束（实测） | 解法 |
|---|---|
| 未签名的原生 ELF 一律无法执行：esbuild 二进制、`@rollup/rollup-openharmony-arm64` 的 `.node`（官方确有 OHOS 构建）都被系统拒绝 dlopen | 全部换 WASM/纯 JS：`esbuild-wasm`（build/context/transform）+ `@swc/wasm`（transformSync）+ `@rollup/wasm-node` + `terser` |
| npm 包 postinstall 里检测平台的脚本会抛错（`Unsupported platform: ohos arm64`） | `npm install --ignore-scripts` + 项目内 `scripts/patch-toolchain.mjs` 显式注入 shim |
| 只有 `/data/service/hnp` 下签名安装的命令行工具能跑（git/python3/make/clang 等） | 需要原生工具时走 HNP / HarmonyBrew 渠道，而不是 npm |
| `npx` 不存在 | 一律用 `node node_modules/<pkg>/bin/...` 或 npm script |
| `registry.npmmirror.com` 不可达 | `.npmrc` 固定官方源 |
| Tailwind v4 需要 `@tailwindcss/oxide` 原生二进制 | 降到纯 JS 的 Tailwind v3 + PostCSS + autoprefixer |

唯一未通过：`WARN native` —— `better-sqlite3` 需要 node-gyp 出 `.node`，产物同样无法加载（属上面的签名约束，不是编译链缺失）。

## 五、项目里可以直接改试的点

```
packages/shared/              跨包纯逻辑（workspace 引用）
apps/web/                     React 18 + TS + Vite 6 + Tailwind3 + Sass + zustand + react-router + axios
  src/features/toolchain/     浏览器运行时自检（11 项，可加检测项）
  src/features/todos/         状态管理 + 远程请求（配 scripts/mock-api.mjs）
  src/__tests__/              逻辑 / 组件渲染 / 样式管道
scripts/                      verify-all 编排 + env/native/webpack/smoke/hmr/proxy/artifacts
vendor/esbuild-sww/           esbuild API 的 WASM 兼容层（本项目最关键的一块适配）
.verify/                      每阶段机器可读结果 (json)
```

## 六、目录里的历史残留

`wasm-rollup/`、`esbuild-probe/`、`dist-webpack/` 是本仓库更早一轮试探留下的目录，
不参与 `npm run verify` 的任何阶段，也不在 README 描述的结构内；当前生效的适配实现是
`vendor/esbuild-sww/` + `scripts/patch-toolchain.mjs` + `toolchecks/webpack/`。保留未删，需要时可自行清理。
