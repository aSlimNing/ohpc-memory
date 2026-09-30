import { createTask, countByStatus, slugify } from "@lab/shared";
import styles from "./theme.module.scss";

type CssModule = { locals?: Record<string, string>; toString?: () => string };

export function report(): string {
  const a = createTask("webpack 校验任务", 1);
  const stats = countByStatus([a]);
  const mod = styles as unknown as CssModule;
  const locals = mod.locals ?? (typeof mod.toString === "function" ? null : (mod as Record<string, string>));
  const cssText = typeof mod.toString === "function" ? mod.toString() : "";
  return JSON.stringify({
    id: a.id,
    stats,
    slug: slugify("Webpack Pipeline"),
    localKeys: locals ? Object.keys(locals).sort().join(",") : "",
    scopedInCss: cssText.includes("wc_theme.module__app") || cssText.includes("wc_"),
    sassCompiled: cssText.includes("#4f6df5") || cssText.includes("4f6df5"),
  });
}
