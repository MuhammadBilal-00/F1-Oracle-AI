"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Target, AlertTriangle, Crown, Medal, Award, Plus, X, Loader2, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Insight } from "@/components/shared/insight";
import { DriverAvatar } from "@/components/shared/driver-avatar";
import { ChartBox } from "@/components/charts/chart-box";
import { CHART, tooltipStyle } from "@/components/charts/theme";
import {
  useSeasons, useRaces, usePrediction, useRaceResults, useFeatureImportance,
  useDriverMap, useCircuits, usePredictCustom,
} from "@/hooks/use-f1";
import { pct } from "@/lib/format";
import type { PredictionTarget, DriverPrediction } from "@/lib/types";

const TARGETS: { value: PredictionTarget; label: string }[] = [
  { value: "race_winner", label: "Winner" },
  { value: "podium", label: "Podium" },
  { value: "top10", label: "Points" },
  { value: "dnf", label: "DNF" },
];

const PODIUM_META = [
  { icon: Crown, tone: "text-gold", ring: "border-gold/30 bg-gold/5" },
  { icon: Medal, tone: "text-muted", ring: "border-border bg-surface-2" },
  { icon: Award, tone: "text-warning", ring: "border-warning/25 bg-warning/5" },
];

type NameFn = (id: number) => string;
type CtorFn = (id: number) => string | undefined;

function prettyFeature(f: string): string {
  return f.replace(/_/g, " ").replace(/\bq([123])\b/gi, "Q$1").replace(/\bctor\b/gi, "constructor").replace(/^\w/, (c) => c.toUpperCase());
}

// ── Shared result renderers ──────────────────────────────────
function Podium({ drivers, name, ctor }: { drivers: DriverPrediction[]; name: NameFn; ctor?: CtorFn }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {drivers.slice(0, 3).map((d, i) => {
        const M = PODIUM_META[i];
        return (
          <Card key={d.driver_id} className={`border ${M.ring}`}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="relative">
                <DriverAvatar id={d.driver_id} name={name(d.driver_id)} size={48} />
                <M.icon className={`absolute -right-1 -top-1 size-4 ${M.tone}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-subtle">Predicted P{i + 1}</p>
                <p className="truncate text-base font-semibold text-foreground">{name(d.driver_id)}</p>
                <p className="truncate text-xs text-subtle">{ctor?.(d.driver_id) ?? `from P${d.grid_position}`}</p>
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
  );
}

function GridTable({ drivers, name }: { drivers: DriverPrediction[]; name: NameFn }) {
  return (
    <Card>
      <CardHeader><CardTitle>Full grid prediction</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-faint">
              <th className="pb-2 font-medium">Pos</th>
              <th className="pb-2 font-medium">Driver</th>
              <th className="pb-2 text-center font-medium">Grid</th>
              <th className="pb-2 text-right font-medium">Win</th>
              <th className="pb-2 text-right font-medium">Podium</th>
              <th className="pb-2 text-right font-medium">Points</th>
              <th className="pb-2 text-right font-medium">DNF</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.driver_id} className="border-t border-border/60">
                <td className="py-2.5 font-mono text-faint">{d.predicted_position}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <DriverAvatar id={d.driver_id} name={name(d.driver_id)} size={24} />
                    <span className="truncate text-foreground">{name(d.driver_id)}</span>
                  </div>
                </td>
                <td className="py-2.5 text-center font-mono text-subtle">{d.grid_position || "—"}</td>
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
  );
}

function ShapCard() {
  const [target, setTarget] = useState<PredictionTarget>("race_winner");
  const fi = useFeatureImportance(target);
  const data = useMemo(
    () => (fi.data?.features ?? []).slice(0, 12).map((f) => ({ feature: prettyFeature(f.feature), importance: +f.importance.toFixed(3) })),
    [fi.data],
  );
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Why the model predicts this</CardTitle>
            <p className="mt-1 text-sm text-subtle">Mean absolute SHAP value — the features driving the {TARGETS.find((t) => t.value === target)?.label.toLowerCase()} model.</p>
          </div>
          <Tabs value={target} onValueChange={(v) => setTarget(v as PredictionTarget)}>
            <TabsList>{TARGETS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {fi.isLoading ? <Skeleton className="h-[340px] w-full" /> : data.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="SHAP unavailable" />
        ) : (
          <ChartBox height={360}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 16, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="feature" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "SHAP"]} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => <Cell key={i} fill={i === 0 ? CHART.accent : CHART.info} fillOpacity={1 - i * 0.05} />)}
              </Bar>
            </BarChart>
          </ChartBox>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tab 1: Scheduled race ────────────────────────────────────
function Scheduled() {
  const { data: seasons } = useSeasons();
  const [season, setSeason] = useState(2023);
  const { data: races } = useRaces(season);
  const [raceId, setRaceId] = useState("");

  const effectiveRaceId = raceId || (races?.length ? String(races[0].race_id) : "");
  const rid = effectiveRaceId ? Number(effectiveRaceId) : undefined;

  const { map } = useDriverMap();
  const pred = usePrediction(rid);
  const results = useRaceResults(rid);

  const raceOptions: ComboItem[] = useMemo(
    () => (races ?? []).map((r) => ({ value: String(r.race_id), label: r.name, sublabel: `R${r.round}`, keywords: [r.circuit_name, r.country] })),
    [races],
  );
  const drivers = useMemo(() => pred.data?.drivers ?? [], [pred.data]);
  const name: NameFn = (id) => map.get(id)?.full_name ?? `#${id}`;
  const ctorMap = useMemo(() => {
    const m = new Map<number, string>();
    results.data?.forEach((r) => m.set(r.driver_id, r.constructor_name));
    return m;
  }, [results.data]);
  const ctor: CtorFn = (id) => ctorMap.get(id);

  const teamPerf = useMemo(() => {
    const m = new Map<string, number>();
    drivers.forEach((d) => { const t = ctorMap.get(d.driver_id); if (t) m.set(t, (m.get(t) ?? 0) + d.win_probability); });
    return [...m.entries()].map(([team, win]) => ({ team, win: +(win * 100).toFixed(1) })).sort((a, b) => b.win - a.win).slice(0, 8);
  }, [drivers, ctorMap]);

  return (
    <div className="space-y-6">
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

      {pred.isError ? <ErrorState message="No prediction available for this race." />
        : !effectiveRaceId || pred.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : drivers.length === 0 ? <EmptyState icon={Target} title="No prediction data" />
        : (
          <>
            <Podium drivers={drivers} name={name} ctor={ctor} />
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <GridTable drivers={drivers.slice(0, 20)} name={name} />
              <Card>
                <CardHeader><CardTitle>Team performance</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {teamPerf.length === 0 ? <p className="py-6 text-center text-sm text-subtle">Team mapping unavailable.</p>
                    : teamPerf.map((t) => (
                      <div key={t.team} className="space-y-1">
                        <div className="flex items-center justify-between text-sm"><span className="truncate text-muted">{t.team}</span><span className="font-mono text-foreground">{t.win}%</span></div>
                        <Progress value={t.win / 100} color="bg-info" height={5} />
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
            <ShapCard />
          </>
        )}
    </div>
  );
}

// ── Tab 2: Build a race (what-if) ────────────────────────────
function Custom() {
  const { data: circuits } = useCircuits();
  const { map, drivers: allDrivers } = useDriverMap();
  const [circuitId, setCircuitId] = useState("");
  const [grid, setGrid] = useState<number[]>([]);
  const [pick, setPick] = useState("");
  const predict = usePredictCustom();

  const circuitOptions: ComboItem[] = useMemo(
    () => (circuits ?? []).map((c) => ({ value: String(c.circuit_id), label: c.name, sublabel: c.country, keywords: [c.country, c.location ?? ""] })),
    [circuits],
  );
  const driverOptions: ComboItem[] = useMemo(
    () => (allDrivers ?? []).filter((d) => !grid.includes(d.driver_id)).map((d) => ({ value: String(d.driver_id), label: d.full_name, sublabel: d.nationality, keywords: [d.nationality] })),
    [allDrivers, grid],
  );
  const name: NameFn = (id) => map.get(id)?.full_name ?? `#${id}`;

  const addDriver = () => {
    if (pick && !grid.includes(Number(pick)) && grid.length < 22) setGrid([...grid, Number(pick)]);
    setPick("");
  };
  const run = () => predict.mutate({ circuitId: Number(circuitId), entries: grid.map((id, i) => ({ driver_id: id, grid: i + 1 })) });
  const result = predict.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <label className="eyebrow">Circuit</label>
              <Combobox items={circuitOptions} value={circuitId} onChange={setCircuitId} placeholder="Choose a circuit" searchPlaceholder="Search circuits…" />
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow">Add driver to grid</label>
              <div className="flex gap-2">
                <Combobox items={driverOptions} value={pick} onChange={setPick} placeholder="Pick a driver" searchPlaceholder="Search 861 drivers…" className="flex-1" />
                <Button variant="secondary" size="md" onClick={addDriver} disabled={!pick}><Plus className="size-4" /></Button>
              </div>
            </div>
          </div>

          {/* Grid builder */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="eyebrow">Starting grid · {grid.length} driver{grid.length === 1 ? "" : "s"}</label>
              {grid.length > 0 && <button onClick={() => setGrid([])} className="text-xs text-subtle hover:text-foreground">Clear all</button>}
            </div>
            {grid.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-subtle">Add at least two drivers and assign the grid order.</p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {grid.map((id, i) => (
                  <div key={id} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1.5">
                    <span className="w-7 text-center font-mono text-xs text-faint">P{i + 1}</span>
                    <DriverAvatar id={id} name={name(id)} size={24} />
                    <span className="flex-1 truncate text-sm text-foreground">{name(id)}</span>
                    <button onClick={() => setGrid(grid.filter((x) => x !== id))} className="text-subtle hover:text-negative"><X className="size-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="primary" size="lg" disabled={!circuitId || grid.length < 2 || predict.isPending} onClick={run}>
            {predict.isPending ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
            Predict this race
          </Button>
        </CardContent>
      </Card>

      {predict.isError ? <ErrorState message="Could not predict this grid. Try different drivers." />
        : result ? (
          <>
            <Insight tone="violet" title="Hypothetical race">
              Each driver is modelled from their most recent form, then placed on this grid at the chosen circuit
              (using their record there where it exists). Probabilities come from the same ensemble used for real races.
            </Insight>
            <Podium drivers={result.drivers} name={name} />
            <GridTable drivers={result.drivers} name={name} />
          </>
        ) : (
          <EmptyState icon={FlaskConical} title="Build your own race" description="Pick a circuit, assemble a grid, and the ensemble predicts the outcome." />
        )}
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="AI"
        title="AI Prediction Center"
        description="The XGBoost/LightGBM/CatBoost ensemble forecasts winner, podium, points and DNF — for real Grands Prix or any grid you build."
      />
      <Tabs defaultValue="scheduled" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled race</TabsTrigger>
          <TabsTrigger value="custom">Build a race</TabsTrigger>
        </TabsList>
        <TabsContent value="scheduled"><Scheduled /></TabsContent>
        <TabsContent value="custom"><Custom /></TabsContent>
      </Tabs>
    </div>
  );
}
