import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

// Tiny built-in plugin: copy index.html into dist (no need for rollup-plugin-copy)
function copyHtml() {
  return {
    name: "copy-html",
    writeBundle(options) {
      const outDir = options.dir || (options.file ? options.file.replace(/\/[^/]*$/, "") : "dist");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(`${outDir}/index.html`, readFileSync("index.html"));
    },
  };
}

export default {
  input: "src/main.tsx",
  output: {
    file: "dist/bundle.js",
    format: "iife",
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    copyHtml(),
  ],
};
