import { expect, it } from "vitest";
import tailwindCss from "../index.css?inline";
import styles from "../styles.module.scss";

it("Tailwind + PostCSS 管道产出真实工具类/preflight", () => {
  expect(tailwindCss).toMatch(/box-sizing|--tw-/);
  expect(tailwindCss).not.toMatch(/@tailwind/);
});

it("Sass 导入与 CSS Modules 均产出作用域类名", () => {
  expect(styles.moduleCard).toMatch(/moduleCard/);
  expect(styles.meta).toBeTruthy();
  expect(styles.moduleCard).not.toBe("moduleCard");
});
