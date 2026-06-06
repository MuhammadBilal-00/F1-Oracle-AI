"use client";

import { useMemo, useState } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { Trophy, Medal, Flag, ShieldCheck, Timer, Crown, Gauge } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { Insight } from "@/components/shared/insight";
import { Progress } from "@/components/ui/progress";
import { ChartBox } from "@/components/charts/chart-box";
import { CHART, tooltipStyle } from "@/components/charts/theme";
import { useConstructors, useConstructor, useConstructorHistory } from "@/hooks/use-f1";
import { num, pct, flag } from "@/lib/format";
import type { ConstructorPerformance } from "@/lib/types";

function StatGrid({ p }: { p?: ConstructorPerformance }) {
  const items = [
    { label: "Race entries", value: p ? num(p.total_race_entries) : "—", icon: Flag },
    { label: "Wins", value: p ? num(p.total_wins) : "—", icon: Trophy },
    { label: "Podiums", value: p ? num(p.total_podiums) : "—", icon: Medal },
    { label: "Points", value: p ? num(p.total_points) : "—" },
    { label: "Win rate", value: p ? pct(p.win_rate) : "—" },
    { label: "Podium rate", value: p ? pct(p.podium_rate) : "—" },
    { label: "Reliability", value: p ? pct(p.reliability_score) : "—" },
    { label: "Avg finish", value: p ? num(p.avg_finish_position, 1) : "—" },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-surface p-4">
          <p className="text-[11px] font-medium text-subtle">{it.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground tnum">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function ConstructorsPage() {
  const { data: list, isError } = useConstructors();
  const [id, setId] = useState("9"); // Red Bull
  const { data: ctor } = useConstructor(Number(id));
  const { data: history } = useConstructorHistory(Number(id));
  const p = ctor?.performance;

  const options: ComboItem[] = useMemo(
    () => (list ?? []).map((c) => ({ value: String(c.constructor_id), label: c.name, sublabel: c.nationality, keywords: [c.nationality ?? ""] })),
    [list],
  );

  const titles = useMemo(() => (history ?? []).filter((h) => h.position === 1).length, [history]);
  const bestFinish = useMemo(() => {
    const ps = (history ?? []).map((h) => h.position).filter((x): x is number => x != null);
    return ps.length ? Math.min(...ps) : null;
  }, [history]);

  if (isError) {
    return <div className="space-y-8"><PageHeader eyebrow="Analytics" title="Constructor Analytics" /><ErrorState /></div>;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Analytics"
        title="Constructor Analytics"
        description="Championships, reliability, pit-stop efficiency and team evolution across the decades."
      />

      <div className="max-w-sm">
        <Combobox items={options} value={id} onChange={setId} placeholder="Select a constructor" searchPlaceholder="Search teams…" />
      </div>

      {/* Hero */}
      <Card hero>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{ctor?.name ?? "—"}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle">
              {ctor && <span>{flag(ctor.nationality)} {ctor.nationality}</span>}
              {p && <span>· {p.first_year}–{p.last_year}</span>}
              {p && <span>· {num(p.years_active)} seasons</span>}
              {p && p.reliability_score >= 0.85 && <Badge variant="positive">High reliability</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gold">
                <Crown className="size-4" />
                <span className="text-2xl font-semibold tnum">{titles}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-subtle">Constructors&rsquo; titles</p>
            </div>
            {bestFinish && (
              <div className="rounded-xl border border-border bg-surface-2 px-5 py-3 text-center">
                <span className="text-2xl font-semibold text-foreground tnum">P{bestFinish}</span>
                <p className="mt-0.5 text-[11px] text-subtle">Best finish</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <StatGrid p={p} />

      {/* Evolution charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Championship points by season</CardTitle></CardHeader>
          <CardContent>
            {history?.length ? (
              <ChartBox height={260}>
                <AreaChart data={history} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.info} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART.info} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={42} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="points" stroke={CHART.info} strokeWidth={2} fill="url(#cpts)" />
                </AreaChart>
              </ChartBox>
            ) : <Skeleton className="h-[260px] w-full" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Championship finish by season</CardTitle></CardHeader>
          <CardContent>
            {history?.length ? (
              <ChartBox height={260}>
                <LineChart data={history} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis reversed domain={[1, "dataMax"]} allowDecimals={false} tickLine={false} axisLine={false} width={42} />
                  <ReferenceLine y={1} stroke={CHART.gold} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`P${v}`, "Position"]} />
                  <Line type="monotone" dataKey="position" stroke={CHART.accent} strokeWidth={2} dot={{ r: 2.5 }} />
                </LineChart>
              </ChartBox>
            ) : <Skeleton className="h-[260px] w-full" />}
          </CardContent>
        </Card>
      </div>

      {/* Reliability + pit + insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Reliability</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Metric icon={ShieldCheck} label="Reliability score" value={p ? pct(p.reliability_score) : "—"} ratio={p?.reliability_score} color="bg-positive" />
            <Metric icon={Gauge} label="DNF rate" value={p ? pct(p.dnf_rate) : "—"} ratio={p?.dnf_rate} color="bg-negative" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pit-stop efficiency</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-subtle"><Timer className="size-4" /></span>
              <div>
                <p className="text-2xl font-semibold text-foreground tnum">{p ? num(p.avg_pit_duration_s, 2) : "—"}<span className="ml-1 text-sm text-subtle">s</span></p>
                <p className="text-[11px] text-subtle">Average pit duration</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2/50 p-3">
              <p className="text-[11px] text-subtle">Consistency (σ)</p>
              <p className="text-sm font-medium text-foreground">± {p ? num(p.pit_consistency_s, 2) : "—"} s</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>AI team profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {p ? (
              <>
                <Insight tone={p.reliability_score >= 0.85 ? "positive" : "warning"}>
                  {ctor?.name} retires from {pct(p.dnf_rate)} of entries — {p.reliability_score >= 0.85 ? "elite mechanical reliability." : "reliability is a relative weakness."}
                </Insight>
                <Insight tone="info">
                  Career win rate of {pct(p.win_rate)} with {num(p.total_wins)} wins across {num(p.total_race_entries)} entries.
                </Insight>
              </>
            ) : <Skeleton className="h-24 w-full" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, ratio, color }: { icon: typeof ShieldCheck; label: string; value: string; ratio?: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted"><Icon className="size-4 text-subtle" />{label}</span>
        <span className="font-mono font-medium text-foreground">{value}</span>
      </div>
      <Progress value={ratio ?? 0} color={color} height={6} />
    </div>
  );
}
