import { execSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 阶段一：可选安装原生依赖（含 node-gyp 编译或预编译产物）
try {
  console.log("[native] 尝试安装 better-sqlite3（触发 node-gyp / prebuild 下载）…");
  execSync("npm install better-sqlite3 --workspace @lab/web --no-save --loglevel=error", {
    cwd: root,
    stdio: "inherit",
    timeout: 540_000,
  });
} catch {
  console.log("NATIVE_RESULT: FAIL — npm 安装 better-sqlite3 失败（网络或平台无预编译产物）");
  process.exit(1);
}

// 阶段二：require 加载 .node 二进制
let db;
try {
  const req = createRequire(path.join(root, "apps/web/package.json"));
  const SQLite = req("better-sqlite3");
  db = new SQLite(":memory:");
} catch (e) {
  console.log(`NATIVE_RESULT: FAIL — 加载原生 .node 失败: ${String(e.message).slice(0, 300)}`);
  process.exit(1);
}

// 阶段三：真实读写验证
const t0 = Date.now();
db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)");
const ins = db.prepare("INSERT INTO t (name) VALUES (?)");
for (let i = 0; i < 5000; i++) ins.run(`row-${i}`);
const count = db.prepare("SELECT COUNT(*) AS c FROM t").get().c;
db.close();
if (count !== 5000) {
  console.log("NATIVE_RESULT: FAIL — 数据校验不一致");
  process.exit(1);
}
console.log(`NATIVE_RESULT: PASS — node-gyp/预编译 + .node dlopen + 5000 行写入 共 ${Date.now() - t0}ms`);
