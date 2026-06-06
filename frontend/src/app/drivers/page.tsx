"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AreaChart, Area, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Trophy, Medal, Flag, Gauge, TrendingUp, Crown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { ChartBox } from "@/components/charts/chart-box";
import { DriverAvatar, driverColor } from "@/components/shared/driver-avatar";
import { CHART, tooltipStyle } from "@/components/charts/theme";
import { useDrivers, useDriver, useDriverHistory } from "@/hooks/use-f1";
import { num, pct, ordinal, flag, ageFrom, driverCode } from "@/lib/format";
import type { CareerStats, Driver, DriverHistoryEntry } from "@/lib/types";

function rating(goatScore?: number, cs?: CareerStats): number | null {
  if (goatScore != null) return Math.round(goatScore * 100);
  if (!cs) return null;
  const r = 0.4 * cs.win_rate + 0.3 * cs.podium_rate + 0.2 * cs.consistency_score + 0.1 * (1 - cs.dnf_rate);
  return Math.round(r * 100);
}

interface SeasonAgg { year: number; points: number; avgFinish: number; wins: number; races: number }
function bySeason(history?: DriverHistoryEntry[]): SeasonAgg[] {
  if (!history) return [];
  const m = new Map<number, { pts: number; pos: number[]; wins: number; races: number }>();
  for (const h of history) {
    const e = m.get(h.year) ?? { pts: 0, pos: [], wins: 0, races: 0 };
    e.pts += h.points ?? 0;
    if (h.position != null) e.pos.push(h.position);
    if (h.position === 1) e.wins += 1;
    e.races += 1;
    m.set(h.year, e);
  }
  return [...m.entries()]
    .map(([year, e]) => ({
      year,
      points: Math.round(e.pts),
      avgFinish: e.pos.length ? +(e.pos.reduce((a, b) => a + b, 0) / e.pos.length).toFixed(1) : 0,
      wins: e.wins,
      races: e.races,
    }))
    .sort((a, b) => a.year - b.year);
}

function radarData(a?: Driver, b?: Driver) {
  const stat = (d?: Driver) => d?.career_stats;
  const axes: { metric: string; key: (cs: CareerStats) => number }[] = [
    { metric: "Win rate", key: (c) => c.win_rate },
    { metric: "Podiums", key: (c) => c.podium_rate },
    { metric: "Points", key: (c) => c.top10_rate },
    { metric: "Consistency", key: (c) => c.consistency_score },
    { metric: "Overtaking", key: (c) => Math.max(0, Math.min(1, c.overtake_efficiency)) },
    { metric: "Reliability", key: (c) => 1 - c.dnf_rate },
  ];
  return axes.map((ax) => ({
    metric: ax.metric,
    a: stat(a) ? Math.round(ax.key(stat(a)!) * 100) : 0,
    b: stat(b) ? Math.round(ax.key(stat(b)!) * 100) : 0,
  }));
}

function StatGrid({ cs }: { cs?: CareerStats }) {
  const items = [
    { label: "Races", value: cs ? num(cs.total_races) : "—", icon: Flag },
    { label: "Wins", value: cs ? num(cs.total_wins) : "—", icon: Trophy },
    { label: "Podiums", value: cs ? num(cs.total_podiums) : "—", icon: Medal },
    { label: "Points", value: cs ? num(cs.total_points) : "—", icon: TrendingUp },
    { label: "Win rate", value: cs ? pct(cs.win_rate) : "—" },
    { label: "Podium rate", value: cs ? pct(cs.podium_rate) : "—" },
    { label: "DNF rate", value: cs ? pct(cs.dnf_rate) : "—" },
    { label: "Avg finish", value: cs ? num(cs.avg_finish_position, 1) : "—" },
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

function DriverHero({ d }: { d?: Driver }) {
  const cs = d?.career_stats;
  const r = rating(d?.goat_score, cs);
  return (
    <Card hero className="overflow-hidden">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-center gap-4">
          {d ? <DriverAvatar id={d.driver_id} name={d.full_name} size={64} /> : <Skeleton className="size-16 rounded-full" />}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{d?.full_name ?? "—"}</h2>
              {d?.code && <Badge variant="outline">{driverCode(d.full_name, d.code)}</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle">
              <span>{d ? `${flag(d.nationality)} ${d.nationality}` : ""}</span>
              {d?.number != null && <span>· #{d.number}</span>}
              {d?.dob && ageFrom(d.dob) && <span>· {ageFrom(d.dob)} yrs</span>}
              {d?.archetype && <Badge variant="violet">{d.archetype}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {d?.goat_rank && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gold">
                <Crown className="size-4" />
                <span className="text-2xl font-semibold tnum">{ordinal(d.goat_rank)}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-subtle">GOAT rank</p>
            </div>
          )}
          <div className="rounded-xl border border-accent/25 bg-accent-soft px-5 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Gauge className="size-4 text-accent" />
              <span className="text-3xl font-semibold text-accent tnum">{r ?? "—"}</span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-accent/80">Oracle Rating</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function DriversPage() {
  const { data: drivers, isError } = useDrivers();
  const [aId, setAId] = useState<string>("830");
  const [bId, setBId] = useState<string>("1");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("driver");
    if (q) setAId(q);
  }, []);

  const options: ComboItem[] = useMemo(
    () =>
      (drivers ?? []).map((d) => ({
        value: String(d.driver_id),
        label: d.full_name,
        sublabel: d.nationality,
        keywords: [d.nationality, d.code ?? ""],
      })),
    [drivers],
  );

  const a = useDriver(Number(aId));
  const b = useDriver(Number(bId));
  const aHist = useDriverHistory(Number(aId));
  const bHist = useDriverHistory(Number(bId));

  const aSeasons = useMemo(() => bySeason(aHist.data), [aHist.data]);
  const radar = useMemo(() => radarData(a.data, b.data), [a.data, b.data]);
  const mergedSeasons = useMemo(() => {
    const bMap = new Map(bySeason(bHist.data).map((s) => [s.year, s.points]));
    const years = new Set([...aSeasons.map((s) => s.year), ...bMap.keys()]);
    return [...years].sort().map((year) => ({
      year,
      a: aSeasons.find((s) => s.year === year)?.points ?? 0,
      b: bMap.get(year) ?? 0,
    }));
  }, [aSeasons, bHist.data]);

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Analytics" title="Driver Analytics" />
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Analytics"
        title="Driver Analytics"
        description="Compare careers, trace performance trends, and read AI ratings and GOAT scores across 75 seasons."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        {/* ── PROFILE ── */}
        <TabsContent value="profile" className="space-y-6">
          <div className="max-w-sm">
            <Combobox items={options} value={aId} onChange={setAId} placeholder="Select a driver" searchPlaceholder="Search 861 drivers…" />
          </div>
          <DriverHero d={a.data} />
          <StatGrid cs={a.data?.career_stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Points by season</CardTitle></CardHeader>
              <CardContent>
                {aSeasons.length ? (
                  <ChartBox height={260}>
                    <AreaChart data={aSeasons} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={CHART.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CHART.accent, strokeOpacity: 0.2 }} />
                      <Area type="monotone" dataKey="points" stroke={CHART.accent} strokeWidth={2} fill="url(#pts)" />
                    </AreaChart>
                  </ChartBox>
                ) : <Skeleton className="h-[260px] w-full" />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Finishing position trend</CardTitle></CardHeader>
              <CardContent>
                {aSeasons.length ? (
                  <ChartBox height={260}>
                    <LineChart data={aSeasons} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} />
                      <YAxis reversed domain={[1, "dataMax"]} tickLine={false} axisLine={false} width={42} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [num(Number(v), 1), "Avg finish"]} />
                      <Line type="monotone" dataKey="avgFinish" stroke={CHART.info} strokeWidth={2} dot={{ r: 2.5 }} />
                    </LineChart>
                  </ChartBox>
                ) : <Skeleton className="h-[260px] w-full" />}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Recent races</CardTitle></CardHeader>
            <CardContent>
              <RecentRaces history={aHist.data} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMPARE ── */}
        <TabsContent value="compare" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Combobox items={options} value={aId} onChange={setAId} placeholder="Driver A" searchPlaceholder="Search drivers…" />
            <Combobox items={options} value={bId} onChange={setBId} placeholder="Driver B" searchPlaceholder="Search drivers…" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <Card>
              <CardHeader><CardTitle>Performance profile</CardTitle></CardHeader>
              <CardContent>
                <ChartBox height={320}>
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke="#ffffff14" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: CHART.muted, fontSize: 11 }} />
                    <Radar name={a.data?.full_name ?? "A"} dataKey="a" stroke={driverColor(Number(aId))} fill={driverColor(Number(aId))} fillOpacity={0.25} strokeWidth={2} />
                    <Radar name={b.data?.full_name ?? "B"} dataKey="b" stroke={driverColor(Number(bId))} fill={driverColor(Number(bId))} fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ChartBox>
                <div className="mt-2 flex items-center justify-center gap-5 text-xs">
                  <Legend color={driverColor(Number(aId))} label={a.data?.full_name} />
                  <Legend color={driverColor(Number(bId))} label={b.data?.full_name} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Head to head</CardTitle></CardHeader>
              <CardContent>
                <HeadToHead a={a.data} b={b.data} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Points by season</CardTitle></CardHeader>
            <CardContent>
              <ChartBox height={280}>
                <LineChart data={mergedSeasons} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={42} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="a" name={a.data?.full_name ?? "A"} stroke={driverColor(Number(aId))} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="b" name={b.data?.full_name ?? "B"} stroke={driverColor(Number(bId))} strokeWidth={2} dot={false} />
                </LineChart>
              </ChartBox>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Legend({ color, label }: { color: string; label?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label ?? "—"}
    </span>
  );
}

function HeadToHead({ a, b }: { a?: Driver; b?: Driver }) {
  const rows: { label: string; a: number; b: number; fmt: (n: number) => string; higher?: boolean }[] = [
    { label: "Wins", a: a?.career_stats?.total_wins ?? 0, b: b?.career_stats?.total_wins ?? 0, fmt: (n) => num(n) },
    { label: "Podiums", a: a?.career_stats?.total_podiums ?? 0, b: b?.career_stats?.total_podiums ?? 0, fmt: (n) => num(n) },
    { label: "Points", a: a?.career_stats?.total_points ?? 0, b: b?.career_stats?.total_points ?? 0, fmt: (n) => num(n) },
    { label: "Win rate", a: a?.career_stats?.win_rate ?? 0, b: b?.career_stats?.win_rate ?? 0, fmt: (n) => pct(n) },
    { label: "Podium rate", a: a?.career_stats?.podium_rate ?? 0, b: b?.career_stats?.podium_rate ?? 0, fmt: (n) => pct(n) },
    { label: "Avg finish", a: a?.career_stats?.avg_finish_position ?? 0, b: b?.career_stats?.avg_finish_position ?? 0, fmt: (n) => num(n, 1), higher: false },
    { label: "Oracle Rating", a: rating(a?.goat_score, a?.career_stats) ?? 0, b: rating(b?.goat_score, b?.career_stats) ?? 0, fmt: (n) => num(n) },
  ];
  return (
    <div className="space-y-1">
      {rows.map((r) => {
        const aWins = (r.higher ?? true) ? r.a >= r.b : r.a <= r.b;
        return (
          <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg px-2 py-2 text-sm">
            <span className={`text-right font-mono tnum ${aWins ? "font-semibold text-foreground" : "text-subtle"}`}>{r.fmt(r.a)}</span>
            <span className="text-center text-[11px] uppercase tracking-wide text-faint">{r.label}</span>
            <span className={`font-mono tnum ${!aWins ? "font-semibold text-foreground" : "text-subtle"}`}>{r.fmt(r.b)}</span>
          </div>
        );
      })}
    </div>
  );
}

function RecentRaces({ history }: { history?: DriverHistoryEntry[] }) {
  if (!history) return <Skeleton className="h-48 w-full" />;
  const recent = [...history].slice(-10).reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-faint">
            <th className="pb-2 font-medium">Season</th>
            <th className="pb-2 font-medium">Grand Prix</th>
            <th className="pb-2 text-center font-medium">Grid</th>
            <th className="pb-2 text-center font-medium">Finish</th>
            <th className="pb-2 text-right font-medium">Points</th>
            <th className="pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((h, i) => (
            <tr key={`${h.race_id}-${i}`} className="border-t border-border/60">
              <td className="py-2.5 font-mono text-muted">{h.year}</td>
              <td className="py-2.5 text-foreground">{h.race_name}</td>
              <td className="py-2.5 text-center font-mono text-subtle">{h.grid ?? "—"}</td>
              <td className="py-2.5 text-center">
                {h.position === 1 ? <Badge variant="gold">P1</Badge>
                  : h.position && h.position <= 3 ? <Badge variant="neutral">P{h.position}</Badge>
                  : <span className="font-mono text-muted">{h.position ?? "—"}</span>}
              </td>
              <td className="py-2.5 text-right font-mono text-muted">{h.points ?? 0}</td>
              <td className="py-2.5 text-right text-xs text-subtle">{h.status ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
