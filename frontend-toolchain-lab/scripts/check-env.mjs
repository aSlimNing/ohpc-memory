import { execSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
fs.mkdirSync(path.join(root, ".verify"), { recursive: true });
const out = [];
const record = (name, ok, detail) => {
  out.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
};
const attempt = async (name, fn) => {
  try {
    record(name, true, String(await fn()));
  } catch (e) {
    record(name, false, String(e?.message ?? e).slice(0, 220));
  }
};

console.log("== 设备前端环境探测 ==");
console.log(`node ${process.version} | platform=${process.platform} arch=${process.arch} | ${os.type()} ${os.release()}`);
console.log(`cpu=${os.cpus().length} cores mem=${(os.totalmem() / 2 ** 30).toFixed(1)}GB tmpdir=${os.tmpdir()}`);

await attempt("npm 可用", () => execSync("npm --version", { encoding: "utf8" }).trim());

await attempt("esbuild 管线（原生 or swc-wasm shim）", () => {
  const req = createRequire(path.join(root, "apps/web/package.json"));
  let bin = null;
  try {
    bin = req("esbuild/bin/esbuild");
  } catch {
    try {
      bin = req.resolve("@esbuild/linux-arm64/bin/esbuild");
    } catch {}
  }
  let nativeMsg = "无原生二进制";
  if (bin && !String(bin).endsWith(".js")) {
    try {
      execSync(`"${bin}" --version`, { stdio: "pipe", timeout: 10000 });
      nativeMsg = "原生 ELF 可执行";
    } catch (e) {
      nativeMsg = `原生存在但被拒(${String(e.message).split("\n")[0].slice(0, 40)})`;
    }
  }
  const es = req("esbuild");
  const out = es.transformSync("const x: number = 1; x", { loader: "ts" });
  if (out.code.includes(": number")) throw new Error("类型未被擦除");
  if (es.version?.includes("sww")) {
    return `${nativeMsg} → 走 @swc/wasm shim (${es.version}), transform 验证 OK`;
  }
  return `${nativeMsg}, esbuild ${es.version} 原生管线 OK`;
});

await attempt("sass 编译器", () => {
  const req = createRequire(path.join(root, "apps/web/package.json"));
  const sass = req("sass");
  return `${sass.info.split("\n")[0]} → ${sass.compileString("$x: red; a{color:$x}").css.trim()}`;
});

await attempt("typescript 编译器", () => {
  const req = createRequire(path.join(root, "apps/web/package.json"));
  return `tsc ${req("typescript").version}`;
});

await attempt("本机 TCP 回环", () => {
  return new Promise((resolve, reject) => {
    const srv = net.createServer((s) => s.end("pong"));
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      const cli = net.connect(port, "127.0.0.1", () => {
        cli.on("data", (d) => {
          srv.close();
          resolve(`127.0.0.1:${port} 往返=${String(d)}`);
        });
      });
      cli.on("error", (e) => {
        srv.close();
        reject(e);
      });
      setTimeout(() => reject(new Error("timeout")), 3000);
    });
    srv.on("error", reject);
  });
});

await attempt("IPv6 回环", () => {
  return new Promise((resolve, reject) => {
    const srv = net.createServer((s) => s.end("v6"));
    srv.listen(0, "::1", () => {
      const port = srv.address().port;
      const cli = net.connect(port, "::1", () => {
        cli.on("data", (d) => {
          srv.close();
          resolve(`::1:${port} OK (${String(d)})`);
        });
      });
      cli.on("error", (e) => {
        srv.close();
        reject(e);
      });
    });
    srv.on("error", reject);
    setTimeout(() => reject(new Error("timeout")), 3000);
  });
});

await attempt("DNS + HTTPS 出网", async () => {
  const t0 = Date.now();
  const r = await fetch("https://registry.npmjs.org/-/ping", { signal: AbortSignal.timeout(15000) });
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  return `registry.npmjs.org ping 200 in ${Date.now() - t0}ms`;
});

await attempt("符号链接", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lab-symlink-"));
  const target = path.join(dir, "t.txt");
  fs.writeFileSync(target, "x");
  const link = path.join(dir, "l.txt");
  fs.symlinkSync(target, link);
  const ok = fs.readlinkSync(link) === target && fs.readFileSync(link, "utf8") === "x";
  fs.rmSync(dir, { recursive: true, force: true });
  if (!ok) throw new Error("symlink 行为异常");
  return "symlink 创建/读取 OK";
});

await attempt("文件名大小写敏感度", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lab-case-"));
  fs.writeFileSync(path.join(dir, "A.txt"), "1");
  const caseSensitive = !fs.existsSync(path.join(dir, "a.txt"));
  fs.rmSync(dir, { recursive: true, force: true });
  return caseSensitive ? "大小写敏感（正常）" : "大小写不敏感（构建命名需注意）";
});

await attempt("fs.watch 文件监听", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lab-watch-"));
  const file = path.join(dir, "w.txt");
  fs.writeFileSync(file, "a");
  return new Promise((resolve) => {
    const done = (msg, ok) => {
      try {
        w.close();
      } catch {}
      fs.rmSync(dir, { recursive: true, force: true });
      if (ok) resolve(msg);
      else reject(new Error(msg));
    };
    const w = fs.watch(file, () => done("事件驱动监听 OK（HMR 可用原生 watcher）", true));
    setTimeout(() => fs.appendFileSync(file, "b"), 200);
    setTimeout(() => done("3s 无事件，需 CHOKIDAR_USEPOLLING", false), 3000);
  });
});

await attempt("rollup（原生/wasm 回退）", () => {
  return import("rollup").then((r) => `rollup ${r.version}（原生管线）`).catch((e) => {
    const msg = String(e?.message ?? e).split("\n")[0].slice(0, 60);
    return import("@rollup/wasm-node").then(
      (w) => `原生不可用(${msg}) → wasm 回退 OK (${w.version})`,
      (e2) => Promise.reject(new Error(`${msg}; wasm 也失败: ${String(e2?.message).slice(0, 60)}`))
    );
  });
});

const fails = out.filter((r) => !r.ok);
console.log(`\n== 探测结束: ${out.length - fails.length}/${out.length} 通过 ==`);
fs.writeFileSync(path.join(root, ".verify", "env.json"), JSON.stringify(out, null, 2));
process.exit(fails.length ? 1 : 0);
