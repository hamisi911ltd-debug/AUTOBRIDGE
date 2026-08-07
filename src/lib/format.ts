export function formatKes(n: number): string {
  return "KSh " + Math.round(n).toLocaleString("en-KE");
}

export function formatUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}
