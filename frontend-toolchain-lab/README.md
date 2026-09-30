# Frontend Toolchain Lab

一个典型的前端工程（React 18 + TypeScript + Vite 6 + Tailwind 3 + Sass + ESLint 9 + Vitest + zustand + react-router + axios，
npm workspaces monorepo），用来**逐项验证这台 HarmonyOS 设备上前端开发各阶段工具链的完备度**。

结论与实测数据见 [RESULTS.md](./RESULTS.md)：`npm run verify` 15 个阶段 14 PASS + 1 WARN。

## 验证矩阵（阶段 × 工具 × 证据）

| 阶段 | 工具链 | 验证方式 |
|---|---|---|
| 环境 | node(npm)、esbuild、sass、tsc、TCP/IPv6 回环、DNS+HTTPS、symlink、大小写、fs.watch | `npm run check:env` → `.verify/env.json` |
| 依赖管理 | npm workspaces + 锁文件 | verify 的 install / lock 阶段 |
| 平台适配 | esbuild→`esbuild-wasm`+`@swc/wasm`，rollup→`@rollup/wasm-node` | `scripts/patch-toolchain.mjs` |
| 原生模块 | node-gyp / `.node` dlopen（可选能力，WARN 不阻塞） | `npm run check:native` |
| 第二打包管线 | webpack 5 + ts-loader + sass-loader + css-loader，产物真实执行 | `npm run check:webpack` |
| 代码检查 | ESLint 9 flat config + typescript-eslint + react-hooks | `npm run lint` |
| 类型检查 | tsc 工程引用（app/node 两个 tsconfig） | `npm run typecheck` |
| 单元测试 | Vitest 3 + jsdom + Testing Library（逻辑/渲染/样式管道） | `npm run test` |
| 样式管道 | Tailwind3 + PostCSS + autoprefixer + Sass + CSS Modules | 测试 + dev 冒烟 + 产物校验 |
| 开发服务器 | vite dev：按需 transform、/@vite/client、跨 workspace 解析 | `npm run smoke:dev` |
| 热更新 | fs.watch → WebSocket `vite-hmr` 推送 → transform 实时更新 | `npm run smoke:hmr` |
| 接口联调 | mock server + vite proxy + axios 请求拦截器 | `npm run mock` + `npm run smoke:proxy` |
| 生产构建 | tsc -b + rollup(wasm) 打包 + esbuild-wasm 压缩 + hash + sourcemap | `npm run build` |
| 产物校验 | 分包/压缩率/CSS 内容/sourcemap 完整性 | `npm run check:artifacts` |
| 静态预览 | vite preview 服务 dist | `npm run smoke:preview` |
| 浏览器运行时 | WebGL / Worker / WebCrypto / Intl / JIT / 存储 / rAF / CORS / 定时器 | 打开页面点“开始检测”，结果写入 `window.__LAB_RESULTS__` 与 localStorage |

## 快速开始

```bash
npm install --ignore-scripts        # 必须跳过 postinstall（原生 esbuild 检测不到 ohos 会失败）
node scripts/patch-toolchain.mjs    # 注入 WASM 兼容层（install 后必做）

npm run dev                          # http://127.0.0.1:5199  （/toolchain 自检页 · /todos 演示页）
node scripts/mock-api.mjs &          # 为 Todo 页远程请求提供后端（dev proxy → 127.0.0.1:8788）
npm run build && npm run preview     # 生产构建与本地预览（http://127.0.0.1:4178）

npm run verify                       # 一次跑完上表全部阶段并在 .verify/summary.json 留档
npm run verify dev-smoke hmr         # 只跑指定阶段
```

## 目录

```
packages/shared/          跨包纯逻辑（workspace 引用验证）
apps/web/                 React 应用（自检页 + Todo 页 + 测试）
scripts/                  verify-all 编排与各阶段探针
vendor/esbuild-sww/       esbuild API 的 WASM 兼容层（本机最关键适配）
toolchecks/webpack/       第二条打包管线
.verify/                  各阶段机器可读结果
```

## 本机的硬约束（写代码前就该知道）

任何未签名的原生二进制都不能执行（包括 rollup 官方发布的 `openharmony-arm64` `.node`）；
所以前端工具链必须挑纯 JS/WASM 实现的包，或把工具装进 HNP / HarmonyBrew 渠道。详见 RESULTS.md 第四节。
