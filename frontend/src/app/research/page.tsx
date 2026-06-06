"use client";

import { useMemo, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, BarChart, Bar, Cell,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { Insight } from "@/components/shared/insight";
import { ChartBox } from "@/components/charts/chart-box";
import { CHART, tooltipStyle, seriesColor } from "@/components/charts/theme";
import { useClusters, useFeatureImportance } from "@/hooks/use-f1";
import { num } from "@/lib/format";
import type { DriverCluster, PredictionTarget } from "@/lib/types";

const TARGETS: { value: PredictionTarget; label: string }[] = [
  { value: "race_winner", label: "Winner" },
  { value: "podium", label: "Podium" },
  { value: "top10", label: "Points" },
  { value: "dnf", label: "DNF" },
];

const METRICS: { key: keyof DriverCluster; label: string }[] = [
  { key: "win_rate", label: "Win%" },
  { key: "podium_rate", label: "Pod%" },
  { key: "dnf_rate", label: "DNF%" },
  { key: "consistency_score", label: "Cons" },
  { key: "avg_points_per_race", label: "PPR" },
  { key: "career_length", label: "Years" },
  { key: "total_wins", label: "Wins" },
];

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const d = Math.sqrt(dx * dy);
  return d === 0 ? 0 : num / d;
}

function prettyFeature(f: string): string {
  return f.replace(/_/g, " ").replace(/\bq([123])\b/gi, "Q$1").replace(/\bctor\b/gi, "constructor").replace(/^\w/, (c) => c.toUpperCase());
}

export default function ResearchPage() {
  const { data: clusters, isError } = useClusters();
  const [proj, setProj] = useState<"pca" | "tsne">("pca");
  const [target, setTarget] = useState<PredictionTarget>("race_winner");
  const fi = useFeatureImportance(target);

  // Group drivers by cluster for the scatter projection.
  const groups = useMemo(() => {
    const m = new Map<number, { label: string; points: { x: number; y: number; name: string; wins: number }[] }>();
    (clusters ?? []).forEach((d) => {
      const key = d.cluster ?? -1;
      if (!m.has(key)) m.set(key, { label: d.cluster_label ?? `Cluster ${key}`, points: [] });
      m.get(key)!.points.push({
        x: proj === "pca" ? d.pca_x : d.tsne_x,
        y: proj === "pca" ? d.pca_y : d.tsne_y,
        name: d.full_name ?? `#${d.driver_id}`,
        wins: d.total_wins,
      });
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [clusters, proj]);

  // Correlation matrix over experienced drivers.
  const corr = useMemo(() => {
    const rows = (clusters ?? []).filter((d) => d.total_races >= 20);
    const cols = METRICS.map((m) => rows.map((r) => Number(r[m.key]) || 0));
    return METRICS.map((_, i) => METRICS.map((__, j) => pearson(cols[i], cols[j])));
  }, [clusters]);

  const topCorr = useMemo(() => {
    let best = { i: 0, j: 1, r: 0 };
    for (let i = 0; i < METRICS.length; i++)
      for (let j = i + 1; j < METRICS.length; j++)
        if (Math.abs(corr[i]?.[j] ?? 0) > Math.abs(best.r)) best = { i, j, r: corr[i][j] };
    return best;
  }, [corr]);

  const fiData = useMemo(
    () => (fi.data?.features ?? []).slice(0, 15).map((f) => ({ feature: prettyFeature(f.feature), importance: +f.importance.toFixed(3) })),
    [fi.data],
  );

  if (isError) {
    return <div className="space-y-8"><PageHeader eyebrow="Advanced" title="Research Lab" /><ErrorState /></div>;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Advanced"
        title="Research Lab"
        description="Unsupervised driver clustering, dimensionality reduction, feature attribution and correlation analysis."
      />

      <Tabs defaultValue="clusters" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clusters">Clustering</TabsTrigger>
          <TabsTrigger value="features">Feature importance</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>

        {/* CLUSTERS */}
        <TabsContent value="clusters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Driver archetypes — {proj === "pca" ? "PCA" : "t-SNE"} projection</CardTitle>
                  <p className="mt-1 text-sm text-subtle">K-means clusters over career features, projected to 2D. Each point is a driver.</p>
                </div>
                <div className="flex gap-1.5">
                  {(["pca", "tsne"] as const).map((p) => (
                    <button key={p} onClick={() => setProj(p)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium uppercase transition-colors ${proj === p ? "border-accent/50 bg-accent-soft text-accent" : "border-border bg-surface-2 text-subtle hover:text-foreground"}`}>
                      {p === "pca" ? "PCA" : "t-SNE"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groups.length ? (
                <>
                  <ChartBox height={420}>
                    <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" dataKey="x" tickLine={false} axisLine={false} tick={false} />
                      <YAxis type="number" dataKey="y" tickLine={false} axisLine={false} tick={false} />
                      <ZAxis range={[26, 26]} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ strokeDasharray: "3 3", stroke: "#ffffff22" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as { name: string; wins: number };
                          return (
                            <div style={tooltipStyle as React.CSSProperties} className="px-3 py-2">
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              <p className="text-xs text-subtle">{num(p.wins)} career wins</p>
                            </div>
                          );
                        }}
                      />
                      {groups.map(([key, g]) => (
                        <Scatter key={key} name={g.label} data={g.points} fill={seriesColor(key)} fillOpacity={0.7} />
                      ))}
                    </ScatterChart>
                  </ChartBox>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                    {groups.map(([key, g]) => (
                      <span key={key} className="flex items-center gap-1.5 text-xs text-muted">
                        <span className="size-2.5 rounded-full" style={{ background: seriesColor(key) }} />
                        {g.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : <Skeleton className="h-[420px] w-full" />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEATURE IMPORTANCE */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>SHAP feature importance</CardTitle>
                  <p className="mt-1 text-sm text-subtle">Mean absolute SHAP value across a 1,000-row sample of the feature store.</p>
                </div>
                <Tabs value={target} onValueChange={(v) => setTarget(v as PredictionTarget)}>
                  <TabsList>{TARGETS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {fi.isLoading ? <Skeleton className="h-[440px] w-full" /> : (
                <ChartBox height={440}>
                  <BarChart data={fiData} layout="vertical" margin={{ top: 0, right: 24, left: 24, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="feature" width={160} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} formatter={(v) => [String(v), "SHAP"]} />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {fiData.map((_, i) => <Cell key={i} fill={i === 0 ? CHART.accent : CHART.violet} fillOpacity={1 - i * 0.04} />)}
                    </Bar>
                  </BarChart>
                </ChartBox>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CORRELATIONS */}
        <TabsContent value="correlations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Career metric correlations</CardTitle>
              <p className="text-sm text-subtle">Pearson correlation across drivers with 20+ races. Red = positive, blue = negative.</p>
            </CardHeader>
            <CardContent>
              {clusters ? (
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="grid" style={{ gridTemplateColumns: `64px repeat(${METRICS.length}, minmax(56px, 1fr))` }}>
                      <div />
                      {METRICS.map((m) => <div key={m.label} className="pb-2 text-center text-[11px] font-medium text-subtle">{m.label}</div>)}
                      {METRICS.map((rowM, i) => (
                        <div key={rowM.label} className="contents">
                          <div className="flex items-center justify-end pr-2 text-[11px] font-medium text-subtle">{rowM.label}</div>
                          {METRICS.map((__, j) => {
                            const r = corr[i]?.[j] ?? 0;
                            const positive = r >= 0;
                            const bg = positive ? `rgba(255,46,63,${Math.abs(r) * 0.85})` : `rgba(91,155,255,${Math.abs(r) * 0.85})`;
                            return (
                              <div key={j} className="m-0.5 grid aspect-square place-items-center rounded-md text-[11px] font-medium tnum"
                                style={{ background: i === j ? "#ffffff10" : bg, color: Math.abs(r) > 0.45 ? "#fff" : "#a1a1aa" }}>
                                {r.toFixed(2)}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : <Skeleton className="h-[360px] w-full" />}
            </CardContent>
          </Card>

          {clusters && (
            <Insight tone="accent" title="Strongest relationship">
              {METRICS[topCorr.i].label} and {METRICS[topCorr.j].label} are {topCorr.r >= 0 ? "positively" : "negatively"} correlated (r = {topCorr.r.toFixed(2)}) — a clear structural pattern across driver careers.
            </Insight>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
