"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Swords, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { DriverAvatar, driverColor } from "@/components/shared/driver-avatar";
import { ChartBox } from "@/components/charts/chart-box";
import { tooltipStyle } from "@/components/charts/theme";
import { useSeasons, useDriverStandings, useConstructorStandings, useRivalries } from "@/hooks/use-f1";
import { num, pct, flag } from "@/lib/format";
import type { Standing } from "@/lib/types";

function StandingsTable({ data, kind }: { data?: Standing[]; kind: "driver" | "constructor" }) {
  if (!data) return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  return (
    <div className="space-y-0.5">
      {data.slice(0, 12).map((s) => {
        const id = (s.driver_id ?? s.constructor_id)!;
        const label = s.full_name ?? s.name ?? "—";
        return (
          <div key={id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/60">
            <span className={`w-5 text-center font-mono text-xs ${s.position === 1 ? "text-gold" : "text-faint"}`}>{s.position}</span>
            {kind === "driver" ? <DriverAvatar id={id} name={label} size={26} /> : <span className="text-base">{flag(s.nationality)}</span>}
            <span className="flex-1 truncate text-sm text-foreground">{label}</span>
            {s.wins > 0 && <span className="text-xs text-subtle">{num(s.wins)}W</span>}
            <span className="w-14 text-right font-mono text-sm text-muted">{num(s.points)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: seasons } = useSeasons();
  const [season, setSeason] = useState(2023);
  const drivers = useDriverStandings(season);
  const ctors = useConstructorStandings(season);
  const rivalries = useRivalries(15);

  const battleData = (drivers.data ?? []).slice(0, 8).map((s) => ({
    name: (s.full_name ?? "").split(" ").pop(),
    id: s.driver_id!,
    points: s.points,
  }));

  if (drivers.isError) {
    return <div className="space-y-8"><PageHeader eyebrow="History" title="Historical Analytics" /><ErrorState /></div>;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="History"
        title="Historical Analytics"
        description="Season standings, championship battles and the greatest rivalries across 75 years of Formula 1."
        actions={
          <Select value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>{(seasons ?? [season]).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="standings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="rivalries">Rivalries</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{season} championship battle</CardTitle></CardHeader>
            <CardContent>
              {battleData.length ? (
                <ChartBox height={240}>
                  <BarChart data={battleData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={42} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} formatter={(v) => [num(Number(v)), "Points"]} />
                    <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                      {battleData.map((d) => <Cell key={d.id} fill={driverColor(d.id)} />)}
                    </Bar>
                  </BarChart>
                </ChartBox>
              ) : <Skeleton className="h-[240px] w-full" />}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-4 text-gold" /> Drivers&rsquo; championship</CardTitle></CardHeader>
              <CardContent><StandingsTable data={drivers.data} kind="driver" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-4 text-info" /> Constructors&rsquo; championship</CardTitle></CardHeader>
              <CardContent><StandingsTable data={ctors.data} kind="constructor" /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rivalries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Swords className="size-4 text-accent" /> Greatest rivalries</CardTitle>
              <p className="text-sm text-subtle">Ranked by intensity — head-to-head wins among team-mates and title contenders.</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {!rivalries.data ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />) :
                rivalries.data.map((r, i) => {
                  const total = r.d1_wins + r.d2_wins || 1;
                  const d1share = (r.d1_wins / total) * 100;
                  return (
                    <div key={i} className="rounded-xl border border-border bg-surface-2/40 p-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex-1 truncate font-medium text-foreground">{r.driver_1_name}</span>
                        <Badge variant="accent">{pct(r.rivalry_intensity, 0)} intensity</Badge>
                        <span className="flex-1 truncate text-right font-medium text-foreground">{r.driver_2_name}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="w-8 text-right font-mono text-sm text-muted">{r.d1_wins}</span>
                        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-border">
                          <div className="h-full bg-accent" style={{ width: `${d1share}%` }} />
                          <div className="h-full bg-info" style={{ width: `${100 - d1share}%` }} />
                        </div>
                        <span className="w-8 font-mono text-sm text-muted">{r.d2_wins}</span>
                      </div>
                      <p className="mt-2 text-center text-[11px] text-faint">{num(r.shared_races)} shared races · {num(r.years_together)} seasons together</p>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
