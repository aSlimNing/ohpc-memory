import { Counter } from "./Counter";

export function App() {
  return (
    <main>
      <h1>Rollup WASM on HarmonyOS PC</h1>
      <p>Bundle built with @rollup/wasm-node (no native binaries).</p>
      <Counter initial={3} step={2} />
      <Counter initial={10} step={5} />
    </main>
  );
}
