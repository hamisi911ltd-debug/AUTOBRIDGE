export function getVisibleImageIndices(total: number, current: number, radius: number): number[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = ((current % safeTotal) + safeTotal) % safeTotal;
  const safeRadius = Math.max(0, Math.floor(radius));

  const unique = new Set<number>();
  const result: number[] = [];

  for (let step = 0; step <= safeRadius; step += 1) {
    const idx = (safeCurrent + step) % safeTotal;
    if (!unique.has(idx)) {
      unique.add(idx);
      result.push(idx);
    }
  }

  for (let step = 1; step <= safeRadius; step += 1) {
    const idx = (safeCurrent - step + safeTotal) % safeTotal;
    if (!unique.has(idx)) {
      unique.add(idx);
      result.push(idx);
    }
  }

  return result;
}
