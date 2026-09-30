import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 本机（OHOS）不能执行任何原生 ELF，工具链全部走 JS/WASM 等价物：
// - esbuild → vendor/esbuild-sww（build/context 委托官方 esbuild-wasm，transformSync 委托 @swc/wasm）
// - rollup  → 官方 @rollup/wasm-node
// 由 scripts/patch-toolchain.mjs 在 npm install 之后注入。
// 配置文件用 .mjs 而非 .ts：避免 Vite 用 esbuild 再打包配置。
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0-dev"),
  },
  server: {
    host: "127.0.0.1",
    port: 5199,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8788",
        changeOrigin: true,
      },
    },
  },
  // 显式列出预打包依赖（含 CJS 的 react/react-dom 子入口），避免运行期二次发现依赖时反复重打包
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "zustand",
      "zustand/middleware",
    ],
    // axios 自带 ESM 浏览器产物；预打包会把它对 node:url/stream 的引用一起卷进来（在浏览器里报错）
    exclude: ["axios"],
  },
  build: {
    sourcemap: true,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    testResolve: { conditions: ["source"] },
  },
});
