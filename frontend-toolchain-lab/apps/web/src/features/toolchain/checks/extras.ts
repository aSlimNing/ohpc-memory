import WorkerUrl from "../echo.worker?worker&inline";
import type { Check } from "./types";

export const workerCheck: Check = {
  id: "worker",
  title: "Web Worker（Vite 内联打包）",
  run: () =>
    new Promise<string>((resolve, reject) => {
      const w = new WorkerUrl();
      const timer = setTimeout(() => {
        w.terminate();
        reject(new Error("worker 3s 无响应"));
      }, 3000);
      w.onmessage = (e: MessageEvent<{ echo: string; from: string }>) => {
        clearTimeout(timer);
        w.terminate();
        resolve(`roundtrip="${e.data.echo}" via ${e.data.from}`);
      };
      w.onerror = (e) => {
        clearTimeout(timer);
        reject(new Error(e.message || "worker error"));
      };
      w.postMessage("ping");
    }),
};

export const networkCheck: Check = {
  id: "network",
  title: "同源 fetch / 静态服务器",
  run: async () => {
    const t0 = performance.now();
    const res = await fetch(location.pathname, { cache: "no-store" });
    const html = await res.text();
    const ms = Math.round(performance.now() - t0);
    if (!html.includes("<div id=\"root\">")) throw new Error("index.html 内容异常");
    return `GET ${location.pathname} → ${res.status} in ${ms}ms (${html.length}B)`;
  },
};

const CORS_URL = "https://cdn.jsdelivr.net/npm/react@18.3.1/package.json";
const PLAIN_URL = "https://example.com/";

export const corsCheck: Check = {
  id: "cors",
  title: "跨源网络 (CORS)",
  run: async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(CORS_URL, { mode: "cors", signal: ctrl.signal });
      const json = await res.json();
      return `带 ACAO 的跨源读取 OK → ${res.status} ${json.name}@${json.version} (acao=${res.headers.get("access-control-allow-origin")})`;
    } catch (e) {
      // 退一步：至少确认浏览器能出网（opaque 响应），把失败原因区分清楚
      try {
        await fetch(PLAIN_URL, { mode: "no-cors", signal: ctrl.signal });
        throw new Error(`跨源带 CORS 校验失败(${String(e).slice(0, 60)})，但 no-cors 可达 → 出网正常，是 CORS 头/白名单限制`);
      } catch (e2) {
        if (String(e2).includes("no-cors 可达")) throw e2;
        throw new Error(`浏览器出网失败: cors=${String(e).slice(0, 50)} no-cors=${String(e2).slice(0, 50)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  },
};

export const storageCheck: Check = {
  id: "storage",
  title: "localStorage + IndexedDB",
  run: async () => {
    const key = "lab-probe";
    localStorage.setItem(key, "1");
    const lsOk = localStorage.getItem(key) === "1";
    localStorage.removeItem(key);

    const idbOk = await new Promise<boolean>((resolve) => {
      if (!("indexedDB" in window)) return resolve(false);
      const req = indexedDB.open("lab-probe", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").put("v", "k");
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
      };
      req.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 2000);
    });
    if (!lsOk || !idbOk) throw new Error(`localStorage=${lsOk} indexedDB=${idbOk}`);
    return "localStorage 读写 OK · IndexedDB 建库/建store/写入 OK";
  },
};

export const pollingCheck: Check = {
  id: "polling",
  title: "后台定时器 (setInterval)",
  run: () =>
    new Promise<string>((resolve, reject) => {
      let ticks = 0;
      const iv = setInterval(() => {
        ticks++;
        if (ticks >= 3) {
          clearInterval(iv);
          resolve(`3×100ms tick 完成（前台计时精度正常）`);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(iv);
        reject(new Error(`仅触发 ${ticks}/3 次（可能被节流）`));
      }, 3000);
    }),
};
