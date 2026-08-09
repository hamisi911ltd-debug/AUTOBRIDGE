export function formatKes(n: number): string {
  return "KSh " + Math.round(n).toLocaleString("en-KE");
}

export function formatUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const SOURCE_SITE_LABELS: Record<string, string> = {
  beforward: "BE FORWARD",
  sbtjapan: "SBT Japan",
};

export function sourceSiteLabel(sourceSite: string | null): string {
  if (!sourceSite) return "Hand-entered";
  return SOURCE_SITE_LABELS[sourceSite] ?? sourceSite;
}
