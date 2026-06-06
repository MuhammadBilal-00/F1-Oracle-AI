"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Dices, Play, Trophy, AlertTriangle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Insight } from "@/components/shared/insight";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { DriverAvatar, driverColor } from "@/components/shared/driver-avatar";
import { ChartBox } from "@/components/charts/chart-box";
import { tooltipStyle } from "@/components/charts/theme";
import { useSeasons, useRaces, useSimulation, useDriverMap } from "@/hooks/use-f1";
import { num, pct } from "@/lib/format";
import type { SimulationEntry } from "@/lib/types";

const SIM_COUNTS = [500, 1000, 2500, 5000, 10000];

export default function SimulatorPage() {
  const { data: seasons } = useSeasons();
  const [season, setSeason] = useState(2023);
  const { data: races } = useRaces(season);
  const [raceId, setRaceId] = useState<string>("");
  const [n, setN] = useState(2500);
  const [run, setRun] = useState<{ raceId: number; n: number } | null>(null);

  const { map } = useDriverMap();
  const sim = useSimulation(run?.raceId, run?.n ?? 1000, !!run);

  const raceOptions: ComboItem[] = useMemo(
    () => (races ?? []).map((r) => ({ value: String(r.race_id), label: r.name, sublabel: `R${r.round}`, keywords: [r.circuit_name, r.country] })),
    [races],
  );

  const ranked = useMemo(() => {
    const rows = sim.data?.results ? [...sim.data.results] : [];
    return rows.sort((a, b) => b.win_probability - a.win_probability);
  }, [sim.data]);

  const name = (e: SimulationEntry) => map.get(e.driver_id)?.full_name ?? e.name;
  const top = ranked[0];
  const chartData = ranked.slice(0, 8).map((e) => ({ name: name(e).split(" ").pop(), driver_id: e.driver_id, win: +(e.win_probability * 100).toFixed(1) }));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Flagship"
        title="Race Simulator"
        description="Run thousands of Monte Carlo simulations on a real Grand Prix grid and watch the outcome distribution emerge."
      />

      {/* Control panel */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[160px_1fr_auto] lg:items-end">
            <div className="space-y-1.5">
              <label className="eyebrow">Season</label>
              <Select value={String(season)} onValueChange={(v) => { setSeason(Number(v)); setRaceId(""); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(seasons ?? [season]).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow">Grand Prix</label>
              <Combobox items={raceOptions} value={raceId} onChange={setRaceId} placeholder="Select a race" searchPlaceholder="Search races…" />
            </div>
            <Button
              variant="primary"
              size="lg"
              disabled={!raceId || sim.isFetching}
              onClick={() => setRun({ raceId: Number(raceId), n })}
              className="w-full lg:w-auto"
            >
              {sim.isFetching ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run simulation
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Simulations</span>
            {SIM_COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setN(c)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium tnum transition-colors ${
                  n === c ? "border-accent/50 bg-accent-soft text-accent" : "border-border bg-surface-2 text-subtle hover:text-foreground"
                }`}
              >
                {num(c)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {sim.isError ? (
        <ErrorState message="This race could not be simulated. Try a different Grand Prix." />
      ) : !run ? (
        <EmptyState icon={Dices} title="Configure and run a simulation" description="Pick a season and Grand Prix, choose how many Monte Carlo iterations to run, then hit Run simulation." />
      ) : sim.isLoading ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="size-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Running {num(run.n)} simulations…</p>
        </CardContent></Card>
      ) : ranked.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No simulation data" description="The model returned no drivers for this race." />
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent"><Trophy className="size-5" /></span>
                <div className="min-w-0">
                  <p className="text-[11px] text-subtle">Predicted winner</p>
                  <p className="truncate text-lg font-semibold text-foreground">{top ? name(top) : "—"}</p>
                </div>
              </div>
              {top && <Progress className="mt-3" value={top.win_probability} color="bg-accent" />}
              {top && <p className="mt-1.5 text-xs text-subtle">{pct(top.win_probability)} win probability</p>}
            </Card>
            <Card className="p-5">
              <p className="text-[11px] text-subtle">Iterations</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tnum">{num(sim.data!.n_simulations)}</p>
              <p className="mt-1 text-xs text-faint">Monte Carlo runs</p>
            </Card>
            <Card className="p-5">
              <p className="text-[11px] text-subtle">Field size</p>
              <p className="mt-1 text-2xl font-semibold text-foreground tnum">{ranked.length}</p>
              <p className="mt-1 text-xs text-faint">drivers on the grid</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Animated leaderboard */}
            <Card>
              <CardHeader><CardTitle>Outcome leaderboard</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                <div className="grid grid-cols-[24px_1fr_auto] items-center gap-3 px-2 pb-1 text-[10px] uppercase tracking-wider text-faint">
                  <span>#</span><span>Driver · win probability</span><span className="text-right">DNF</span>
                </div>
                {ranked.slice(0, 12).map((e, i) => (
                  <motion.div
                    key={e.driver_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className="grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/60"
                  >
                    <span className="text-center font-mono text-xs text-faint">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <DriverAvatar id={e.driver_id} name={name(e)} size={26} />
                        <span className="flex-1 truncate text-sm text-foreground">{name(e)}</span>
                        <span className="font-mono text-xs font-medium text-foreground">{pct(e.win_probability)}</span>
                      </div>
                      <Progress className="mt-1.5" value={e.win_probability} color="bg-accent" height={4} />
                      <div className="mt-1 flex gap-3 text-[10px] text-faint">
                        <span>Podium {pct(e.podium_probability, 0)}</span>
                        <span>Top 10 {pct(e.top10_probability, 0)}</span>
                        <span>Avg P{num(e.avg_finish, 1)} ± {num(e.finish_std, 1)}</span>
                      </div>
                    </div>
                    <Badge variant={e.dnf_probability >= 0.3 ? "negative" : "neutral"}>{pct(e.dnf_probability, 0)}</Badge>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Win probability chart + AI explanation */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Win probability</CardTitle></CardHeader>
                <CardContent>
                  <ChartBox height={260}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <XAxis type="number" hide domain={[0, "dataMax"]} />
                      <YAxis type="category" dataKey="name" width={70} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Win"]} cursor={{ fill: "#ffffff08" }} />
                      <Bar dataKey="win" radius={[0, 4, 4, 0]}>
                        {chartData.map((d) => <Cell key={d.driver_id} fill={driverColor(d.driver_id)} />)}
                      </Bar>
                    </BarChart>
                  </ChartBox>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>AI read</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {top && (
                    <Insight tone="accent" title="Favourite">
                      {name(top)} wins {pct(top.win_probability)} of {num(sim.data!.n_simulations)} simulations, finishing on average P{num(top.avg_finish, 1)}.
                    </Insight>
                  )}
                  {ranked[1] && top && (
                    <Insight tone="info" title="Margin">
                      {pct(top.win_probability - ranked[1].win_probability)} clear of {name(ranked[1])} — {top.win_probability - ranked[1].win_probability > 0.2 ? "a commanding favourite." : "a genuine contest up front."}
                    </Insight>
                  )}
                  {(() => {
                    const risk = [...ranked].sort((a, b) => b.dnf_probability - a.dnf_probability)[0];
                    return risk ? <Insight tone="negative" title="Retirement risk">{name(risk)} carries the highest DNF probability at {pct(risk.dnf_probability)}.</Insight> : null;
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
