export function formatKes(n: number): string {
  return "KSh " + Math.round(n).toLocaleString("en-KE");
}

export function formatUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const SOURCE_SITE_LABELS: Record<string, string> = {
  beforward: "BE FORWARD",
  sbtjapan: "SBT Japan",
  autocom: "AUTOCOM",
  nikkyo: "Nikkyo",
  jpctrade: "JPC Trade",
  dubicars: "Dubicars",
  mykautotrader: "MYK Auto Trader",
};

export function sourceSiteLabel(sourceSite: string | null): string {
  if (!sourceSite) return "Hand-entered";
  return SOURCE_SITE_LABELS[sourceSite] ?? sourceSite;
}

/**
 * Deterministic per-vehicle "save" percentage (8-17%) driving the red
 * discount tag and crossed-out higher price shown everywhere a vehicle's
 * price appears (cards, offers slider, showcase posters) - stable across
 * renders/reloads since it's derived from the vehicle's own id, not
 * Math.random().
 */
export function discountPercent(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return 8 + (hash % 10);
}

/** The crossed-out "was" price implied by `totalUsd` and its discount percent. */
export function wasPriceUsd(totalUsd: number, id: string): number {
  return Math.round(totalUsd / (1 - discountPercent(id) / 100));
}
