import { useState } from "react";
import { describeCount } from "./format";

export interface CounterProps {
  initial: number;
  step: number;
}

export function Counter({ initial, step }: CounterProps) {
  const [count, setCount] = useState(initial);
  return (
    <div className="counter">
      <button onClick={() => setCount((c) => c + step)}>+{step}</button>
      <button onClick={() => setCount((c) => c - step)}>-{step}</button>
      <span>{describeCount(count)}</span>
    </div>
  );
}
