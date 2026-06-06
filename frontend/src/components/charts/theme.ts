/** Shared Recharts styling tokens so every chart looks consistent. */

export const CHART = {
  axis: { stroke: "#52525b", fontSize: 11 },
  grid: "#ffffff0d",
  // Categorical palette (matches driver-avatar palette).
  series: ["#ff2e3f", "#5b9bff", "#34d399", "#f5b544", "#9a7cff", "#46c6e0", "#ff7ab6", "#f5c451"],
  accent: "#ff2e3f",
  positive: "#34d399",
  negative: "#fb7185",
  info: "#5b9bff",
  warning: "#f5b544",
  violet: "#9a7cff",
  gold: "#f5c451",
  muted: "#71717a",
} as const;

export const tooltipStyle = {
  background: "#1c1c21",
  border: "1px solid #ffffff24",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 16px 40px -12px rgb(0 0 0 / 0.55)",
} as const;

export function seriesColor(i: number): string {
  return CHART.series[i % CHART.series.length];
}
