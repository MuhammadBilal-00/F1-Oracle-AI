"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Target, AlertTriangle, Crown, Medal, Award } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { DriverAvatar } from "@/components/shared/driver-avatar";
import { ChartBox } from "@/components/charts/chart-box";
import { CHART, tooltipStyle } from "@/components/charts/theme";
import { useSeasons, useRaces, usePrediction, useRaceResults, useFeatureImportance, useDriverMap } from "@/hooks/use-f1";
import { pct } from "@/lib/format";
import type { PredictionTarget, DriverPrediction } from "@/lib/types";

const TARGETS: { value: PredictionTarget; label: string }[] = [
  { value: "race_winner", label: "Winner" },
  { value: "podium", label: "Podium" },
  { value: "top10", label: "Points" },
  { value: "dnf", label: "DNF" },
];

function prettyFeature(f: string): string {
  return f
    .replace(/_/g, " ")
    .replace(/\bms\b/gi, "ms")
    .replace(/\bq([123])\b/gi, "Q$1")
    .replace(/\bctor\b/gi, "constructor")
    .replace(/\bcv\b/gi, "consistency")
    .replace(/\bx\b/g, "×")
    .replace(/^\w/, (c) => c.toUpperCase());
}

const PODIUM_META = [
  { icon: Crown, tone: "text-gold", ring: "border-gold/30 bg-gold/5" },
  { icon: Medal, tone: "text-muted", ring: "border-border bg-surface-2" },
  { icon: Award, tone: "text-warning", ring: "border-warning/25 bg-warning/5" },
];

export default function PredictionsPage() {
  const { data: seasons } = useSeasons();
  const [season, setSeason] = useState(2023);
  const { data: races } = useRaces(season);
  const [raceId, setRaceId] = useState("");
  const [target, setTarget] = useState<PredictionTarget>("race_winner");

  // Default to the season's first race for instant feedback; user selection overrides.
  const effectiveRaceId = raceId || (races?.length ? String(races[0].race_id) : "");
  const rid = effectiveRaceId ? Number(effectiveRaceId) : undefined;

  const { map } = useDriverMap();
  const pred = usePrediction(rid);
  const results = useRaceResults(rid);
  const fi = useFeatureImportance(target);

  const raceOptions: ComboItem[] = useMemo(
    () => (races ?? []).map((r) => ({ value: String(r.race_id), label: r.name, sublabel: `R${r.round}`, keywords: [r.circuit_name, r.country] })),
    [races],
  );

  const drivers = useMemo(() => pred.data?.drivers ?? [], [pred.data]);
  const name = (d: DriverPrediction) => map.get(d.driver_id)?.full_name ?? `#${d.driver_id}`;
  const podium = drivers.slice(0, 3);

  const ctorMap = useMemo(() => {
    const m = new Map<number, string>();
    results.data?.forEach((r) => m.set(r.driver_id, r.constructor_name));
    return m;
  }, [results.data]);

  const teamPerf = useMemo(() => {
    const m = new Map<string, number>();
    drivers.forEach((d) => {
      const team = ctorMap.get(d.driver_id);
      if (team) m.set(team, (m.get(team) ?? 0) + d.win_probability);
    });
    return [...m.entries()].map(([team, win]) => ({ team, win: +(win * 100).toFixed(1) })).sort((a, b) => b.win - a.win).slice(0, 8);
  }, [drivers, ctorMap]);

  const fiData = useMemo(
    () => (fi.data?.features ?? []).slice(0, 12).map((f) => ({ feature: prettyFeature(f.feature), importance: +f.importance.toFixed(3) })),
    [fi.data],
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="AI"
        title="AI Prediction Center"
        description="The XGBoost/LightGBM/CatBoost ensemble forecasts winner, podium, points and DNF — with SHAP explanations of what drives each call."
      />

      {/* Controls */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="space-y-1.5">
              <label className="eyebrow">Season</label>
              <Select value={String(season)} onValueChange={(v) => { setSeason(Number(v)); setRaceId(""); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{(seasons ?? [season]).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow">Grand Prix</label>
              <Combobox items={raceOptions} value={effectiveRaceId} onChange={setRaceId} placeholder="Select a race" searchPlaceholder="Search races…" />
            </div>
          </div>
        </CardContent>
      </Card>

      {pred.isError ? (
        <ErrorState message="No prediction available for this race." />
      ) : !effectiveRaceId || pred.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : drivers.length === 0 ? (
        <EmptyState icon={Target} title="No prediction data" description="The model has no features for this race." />
      ) : (
        <>
          {/* Podium */}
          <div className="grid gap-4 sm:grid-cols-3">
            {podium.map((d, i) => {
              const M = PODIUM_META[i];
              return (
                <Card key={d.driver_id} className={`border ${M.ring}`}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="relative">
                      <DriverAvatar id={d.driver_id} name={name(d)} size={48} />
                      <M.icon className={`absolute -right-1 -top-1 size-4 ${M.tone}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-subtle">Predicted P{i + 1}</p>
                      <p className="truncate text-base font-semibold text-foreground">{name(d)}</p>
                      <p className="text-xs text-subtle">{ctorMap.get(d.driver_id) ?? ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground tnum">{pct(d.win_probability)}</p>
                      <p className="text-[11px] text-faint">win</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Full grid */}
            <Card>
              <CardHeader><CardTitle>Full grid prediction</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-faint">
                      <th className="pb-2 font-medium">Pos</th>
                      <th className="pb-2 font-medium">Driver</th>
                      <th className="pb-2 text-right font-medium">Win</th>
                      <th className="pb-2 text-right font-medium">Podium</th>
                      <th className="pb-2 text-right font-medium">Points</th>
                      <th className="pb-2 text-right font-medium">DNF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.slice(0, 20).map((d) => (
                      <tr key={d.driver_id} className="border-t border-border/60">
                        <td className="py-2.5 font-mono text-faint">{d.predicted_position}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <DriverAvatar id={d.driver_id} name={name(d)} size={24} />
                            <span className="truncate text-foreground">{name(d)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono text-foreground">{pct(d.win_probability, 0)}</td>
                        <td className="py-2.5 text-right font-mono text-muted">{pct(d.podium_probability, 0)}</td>
                        <td className="py-2.5 text-right font-mono text-muted">{pct(d.top10_probability, 0)}</td>
                        <td className="py-2.5 text-right">
                          <span className={`font-mono ${d.dnf_probability >= 0.3 ? "text-negative" : "text-subtle"}`}>{pct(d.dnf_probability, 0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Team performance */}
            <Card>
              <CardHeader><CardTitle>Team performance</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {teamPerf.length === 0 ? (
                  <p className="py-6 text-center text-sm text-subtle">Team mapping unavailable for this race.</p>
                ) : (
                  teamPerf.map((t) => (
                    <div key={t.team} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate text-muted">{t.team}</span>
                        <span className="font-mono text-foreground">{t.win}%</span>
                      </div>
                      <Progress value={t.win / 100} color="bg-info" height={5} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* SHAP explainability */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Why the model predicts this</CardTitle>
                  <p className="mt-1 text-sm text-subtle">Mean absolute SHAP value — the features driving the {TARGETS.find((t) => t.value === target)?.label.toLowerCase()} model.</p>
                </div>
                <Tabs value={target} onValueChange={(v) => setTarget(v as PredictionTarget)}>
                  <TabsList>
                    {TARGETS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {fi.isLoading ? (
                <Skeleton className="h-[340px] w-full" />
              ) : fiData.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="SHAP unavailable" description="Feature importance could not be computed for this target." />
              ) : (
                <ChartBox height={360}>
                  <BarChart data={fiData} layout="vertical" margin={{ top: 0, right: 24, left: 16, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="feature" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "SHAP"]} cursor={{ fill: "#ffffff08" }} />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {fiData.map((_, i) => <Cell key={i} fill={i === 0 ? CHART.accent : CHART.info} fillOpacity={1 - i * 0.05} />)}
                    </Bar>
                  </BarChart>
                </ChartBox>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
