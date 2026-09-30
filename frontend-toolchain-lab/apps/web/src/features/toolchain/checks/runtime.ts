import type { Check } from "./types";

export const platformCheck: Check = {
  id: "platform",
  title: "运行环境识别",
  run: async () => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    return [
      `platform=${nav.userAgentData?.platform ?? nav.platform}`,
      `ua=${nav.userAgent.slice(0, 80)}`,
      `cores=${nav.hardwareConcurrency}`,
      `memory=${(nav as { deviceMemory?: number }).deviceMemory ?? "?"}GB`,
    ].join(" · ");
  },
};

export const intlCheck: Check = {
  id: "intl",
  title: "国际化 (Intl)",
  run: async () => {
    const nf = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(12345.6);
    const df = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(new Date(2026, 8, 28));
    const coll = ["乙", "甲", "丙"].sort(new Intl.Collator("zh-CN").compare).join(",");
    return `${nf} · ${df} · 中文排序=${coll}`;
  },
};

export const webglCheck: Check = {
  id: "webgl",
  title: "WebGL 图形栈",
  run: async () => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return Promise.reject(new Error("no webgl context"));
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    return `version=${gl.getParameter(gl.VERSION)} · renderer=${renderer}`;
  },
};

export const jitCheck: Check = {
  id: "jit",
  title: "JIT 执行与吞吐",
  run: async () => {
    const add = new Function("a", "b", "return a + b") as (a: number, b: number) => number;
    if (add(1, 2) !== 3) throw new Error("dynamic function failed");
    const t0 = performance.now();
    let acc = 0;
    for (let i = 0; i < 3_000_000; i++) acc += i % 7;
    const loopMs = Math.round(performance.now() - t0);
    if (acc <= 0) throw new Error("loop produced no result");
    const obj = { rows: Array.from({ length: 20_000 }, (_, i) => ({ i, s: `row-${i}`, v: i * 1.5 })) };
    const json = JSON.stringify(obj);
    const back = JSON.parse(json);
    const roundMs = Math.round(performance.now() - t0 - loopMs);
    if (back.rows[19999].i !== 19999) throw new Error("json roundtrip failed");
    return `3M 循环=${loopMs}ms · JSON 400KB 序列化+解析=${roundMs}ms`;
  },
};

export const cryptoCheck: Check = {
  id: "crypto",
  title: "Web Crypto",
  run: async () => {
    const data = new TextEncoder().encode("toolchain-lab");
    const digest = await crypto.subtle.digest("SHA-256", data);
    const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    return `sha256=${hex.slice(0, 16)}… · aes-gcm ${data.length}B→${enc.byteLength}B ok`;
  },
};

export const rafCheck: Check = {
  id: "raf",
  title: "渲染帧驱动 (rAF)",
  run: () =>
    new Promise<string>((resolve, reject) => {
      // 隐藏/后台窗口里 rAF 与定时器都会被节流（定时器最小间隔可能被拉到 1s 以上），
      // 因此这里不要求固定 500ms：rAF 能跑就跑满 30 帧；若被节流则用定时器补 20 帧并如实标注。
      let frames = 0;
      let pumped = 0;
      const start = performance.now();
      const summary = () =>
        `${frames > 0 ? "rAF 由合成器驱动" : "rAF 未驱动（后台窗口节流）"}：rAF帧=${frames} 定时器补帧=${pumped} 用时=${Math.round(performance.now() - start)}ms`;
      const finish = () => resolve(summary());
      const tick = () => {
        frames++;
        if (frames >= 30) finish();
        else requestAnimationFrame(tick);
      };
      const pump = () => {
        pumped++;
        if (pumped >= 20 || frames >= 30 || performance.now() - start > 6000) finish();
        else setTimeout(pump, 30);
      };
      requestAnimationFrame(tick);
      setTimeout(() => {
        if (frames < 30) pump();
      }, 400);
      setTimeout(() => {
        if (frames === 0 && pumped === 0) reject(new Error("rAF 与定时器都没有产生任何回调（窗口完全冻结）"));
        else finish();
      }, 8000);
    }),
};
