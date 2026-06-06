"use client";

import { useMemo, useState } from "react";
import { MapPin, Repeat, AlertTriangle, Zap, Timer, Crown, Flag } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/shared/states";
import { Insight, type InsightTone } from "@/components/shared/insight";
import { Progress } from "@/components/ui/progress";
import { DriverAvatar } from "@/components/shared/driver-avatar";
import { useCircuits, useCircuitWinners } from "@/hooks/use-f1";
import { num, pct, flag } from "@/lib/format";
import type { Circuit } from "@/lib/types";

function gauges(c?: Circuit) {
  return [
    { label: "Overtaking index", value: c?.overtake_index, fmt: pct, color: "bg-info", icon: Repeat, ratio: true },
    { label: "DNF rate", value: c?.avg_dnf_rate, fmt: pct, color: "bg-negative", icon: AlertTriangle, ratio: true },
    { label: "Chaos index", value: c?.circuit_chaos_index, fmt: pct, color: "bg-warning", icon: Zap, ratio: true },
    { label: "Avg pit stops", value: c?.avg_pit_stops_per_race, fmt: (v: number) => num(v, 1), color: "bg-violet", icon: Timer, ratio: false },
  ];
}

function profile(c?: Circuit): { tone: InsightTone; text: string }[] {
  if (!c) return [];
  const out: { tone: InsightTone; text: string }[] = [];
  const ot = c.overtake_index ?? 0;
  if (ot >= 0.5) out.push({ tone: "info", text: `High overtaking index (${pct(ot)}) — positions change readily, so race pace outweighs grid slot.` });
  else out.push({ tone: "warning", text: `Low overtaking index (${pct(ot)}) — track position is king and qualifying is decisive.` });

  const dnf = c.avg_dnf_rate ?? 0;
  if (dnf >= 0.35) out.push({ tone: "negative", text: `Attritional circuit: ${pct(dnf)} average DNF rate. Reliability and clean racing are rewarded.` });
  else out.push({ tone: "positive", text: `Comparatively forgiving: ${pct(dnf)} average DNF rate.` });

  const pits = c.avg_pit_stops_per_race ?? 0;
  out.push({ tone: "neutral", text: `Typically ${num(pits, 1)} stops per race — ${pits >= 2.5 ? "multi-stop strategy is common." : "track position often favours fewer stops."}` });
  return out;
}

export default function CircuitsPage() {
  const { data: circuits, isError } = useCircuits();
  const [id, setId] = useState("1");
  const circuit = useMemo(() => circuits?.find((c) => String(c.circuit_id) === id), [circuits, id]);
  const { data: winners } = useCircuitWinners(Number(id));

  const options: ComboItem[] = useMemo(
    () => (circuits ?? []).map((c) => ({ value: String(c.circuit_id), label: c.name, sublabel: c.country, keywords: [c.country, c.location ?? ""] })),
    [circuits],
  );

  const topWinner = useMemo(() => {
    if (!winners?.length) return null;
    const counts = new Map<string, number>();
    winners.forEach((w) => counts.set(w.winner, (counts.get(w.winner) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [winners]);

  if (isError) {
    return <div className="space-y-8"><PageHeader eyebrow="Intelligence" title="Circuit Intelligence" /><ErrorState /></div>;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Intelligence"
        title="Circuit Intelligence"
        description="Overtaking difficulty, attrition, pit trends and AI profiles for every track on the calendar."
      />

      <div className="max-w-sm">
        <Combobox items={options} value={id} onChange={setId} placeholder="Select a circuit" searchPlaceholder="Search circuits…" />
      </div>

      {/* Hero */}
      <Card hero>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{circuit?.name ?? "—"}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle">
              {circuit && <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {circuit.location}, {flag(circuit.country)} {circuit.country}</span>}
              {circuit?.total_races_hosted != null && <Badge variant="neutral">{num(circuit.total_races_hosted)} races hosted</Badge>}
            </div>
          </div>
          {topWinner && (
            <div className="rounded-xl border border-border bg-surface-2 px-5 py-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gold"><Crown className="size-4" /><span className="text-lg font-semibold">{topWinner[0]}</span></div>
              <p className="mt-0.5 text-[11px] text-subtle">Most wins here ({topWinner[1]})</p>
            </div>
          )}
        </div>
      </Card>

      {/* Gauges */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {gauges(circuit).map((g) => (
          <Card key={g.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-subtle">{g.label}</p>
              <g.icon className="size-4 text-subtle" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tnum">
              {g.value != null ? g.fmt(g.value) : "—"}
            </p>
            {g.ratio && <Progress className="mt-3" value={g.value ?? 0} color={g.color} height={5} />}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Winners */}
        <Card>
          <CardHeader><CardTitle>Recent winners</CardTitle></CardHeader>
          <CardContent>
            {!winners ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : winners.length === 0 ? (
              <EmptyState icon={Flag} title="No race results" description="This circuit has no recorded race results in the dataset." />
            ) : (
              <div className="space-y-1">
                {winners.map((w, i) => (
                  <div key={`${w.year}-${i}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/60">
                    <span className="w-10 font-mono text-xs text-faint">{w.year}</span>
                    <DriverAvatar id={w.driver_id} name={w.winner} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{w.winner}</p>
                      <p className="truncate text-xs text-subtle">{w.constructor_name}</p>
                    </div>
                    {w.grid != null && (
                      <Badge variant={w.grid === 1 ? "gold" : "neutral"}>from P{w.grid}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI profile */}
        <Card>
          <CardHeader><CardTitle>AI circuit profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {circuit ? profile(circuit).map((p, i) => <Insight key={i} tone={p.tone}>{p.text}</Insight>)
              : Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
