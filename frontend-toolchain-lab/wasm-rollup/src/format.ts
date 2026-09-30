export function describeCount(count: number): string {
  const parity = count % 2 === 0 ? "even" : "odd";
  return `count = ${count} (${parity})`;
}
