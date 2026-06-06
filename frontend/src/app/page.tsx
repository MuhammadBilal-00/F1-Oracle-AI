"use client";

import Link from "next/link";
import { Dices, Target, Flag, Users, Route, Gauge, Trophy, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { Insight } from "@/components/shared/insight";
import { Reveal } from "@/components/shared/motion";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DriverAvatar } from "@/components/shared/driver-avatar";
import { useOverview, useGoat, useDriverStandings, useConstructorStandings } from "@/hooks/use-f1";
import { useUI } from "@/store/ui-store";
import { num, pct, flag } from "@/lib/format";
import type { PredictionTarget } from "@/lib/types";

const MODEL_LABELS: Record<PredictionTarget, string> = {
  race_winner: "Race winner",
  podium: "Podium finish",
  top10: "Points (Top 10)",
  dnf: "DNF risk",
};

export default function OverviewPage() {
  const season = useUI((s) => s.season);
  const { data: ov, isLoading } = useOverview();
  const { data: goat } = useGoat(3);
  const { data: drivers } = useDriverStandings(season);
  const { data: ctors } = useConstructorStandings(season);

  const winnerAuc = ov?.model_metrics?.race_winner?.roc_auc;
  const leader = drivers?.[0];
  const ctorLeader = ctors?.[0];
  const goatLeader = goat?.[0];

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <Reveal>
        <Card hero className="overflow-hidden">
          <div className="grid gap-10 p-7 sm:p-9 lg:grid-cols-[1.35fr_1fr] lg:p-11">
            <div className="space-y-5">
              <Badge variant="accent">XGBoost · LightGBM · CatBoost ensemble</Badge>
              <h1 className="text-balance text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Formula 1, decoded by <span className="text-accent">machine learning</span>.
              </h1>
              <p className="max-w-xl text-pretty text-[15px] leading-relaxed text-muted">
                Predict race outcomes, run thousands of Monte Carlo simulations, and explore
                {" "}{ov ? num(ov.total_seasons) : "75"} seasons of Grand Prix history — all in one
                premium intelligence platform.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button variant="primary" size="lg" asChild>
                  <Link href="/simulator">
                    <Dices className="size-4" /> Run a simulation
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/predictions">
                    <Target className="size-4" /> AI predictions
                  </Link>
                </Button>
              </div>
              <p className="pt-1 font-mono text-xs text-faint">
                {ov ? `${ov.first_year}–${ov.last_year}` : "1950–2024"} ·{" "}
                {ov ? num(ov.total_races) : "1,125"} Grands Prix ·{" "}
                {ov ? num(ov.total_results) : "26,759"} results
              </p>
            </div>

            {/* Model scoreboard */}
            <div className="rounded-2xl border border-border bg-background/40 p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Model accuracy</p>
                <Badge variant="positive">Validated</Badge>
              </div>
              <div className="mt-4 space-y-3.5">
                {(Object.keys(MODEL_LABELS) as PredictionTarget[]).map((t) => {
                  const m = ov?.model_metrics?.[t];
                  return (
                    <div key={t} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted">{MODEL_LABELS[t]}</span>
                        <span className="font-mono font-medium text-foreground">
                          {m ? pct(m.roc_auc, 1) : "—"}
                        </span>
                      </div>
                      <Progress value={m?.roc_auc ?? 0} color="bg-accent" height={5} />
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-faint">
                Held-out ROC AUC per classifier. Best model auto-selected per target.
              </p>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* ── KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delay={0.05}>
          <StatCard label="Grands Prix" value={ov ? num(ov.total_races) : "—"} icon={Flag} sublabel={`${ov?.total_seasons ?? "—"} seasons`} loading={isLoading} />
        </Reveal>
        <Reveal delay={0.1}>
          <StatCard label="Drivers" value={ov ? num(ov.total_drivers) : "—"} icon={Users} sublabel="career profiles" loading={isLoading} />
        </Reveal>
        <Reveal delay={0.15}>
          <StatCard label="Circuits" value={ov ? num(ov.total_circuits) : "—"} icon={Route} sublabel="worldwide" loading={isLoading} />
        </Reveal>
        <Reveal delay={0.2}>
          <StatCard
            label="Winner model accuracy"
            value={winnerAuc ? pct(winnerAuc, 1) : "—"}
            icon={Gauge}
            accent="text-accent"
            sublabel="ROC AUC"
            loading={isLoading}
          />
        </Reveal>
      </div>

      {/* ── Insights + championship snapshot ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Reveal delay={0.1} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>AI insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ov ? (
                <>
                  <Insight tone="accent" title="High-confidence winner model">
                    The race-winner classifier reaches{" "}
                    <strong className="text-foreground">{pct(ov.model_metrics.race_winner.roc_auc, 1)}</strong>{" "}
                    ROC AUC — qualifying pace and circuit-specific win history are its strongest signals.
                  </Insight>
                  {goatLeader && (
                    <Insight tone="gold" title="All-time GOAT leader">
                      <strong className="text-foreground">{goatLeader.full_name}</strong> tops the GOAT index with{" "}
                      {num(goatLeader.total_wins)} wins and a {pct(goatLeader.win_rate)} win rate across{" "}
                      {num(goatLeader.total_races)} starts.
                    </Insight>
                  )}
                  {leader && (
                    <Insight tone="info" title={`${season} championship`}>
                      <strong className="text-foreground">{leader.full_name}</strong> leads the drivers&rsquo;
                      standings on {num(leader.points)} points with {num(leader.wins)} wins.
                    </Insight>
                  )}
                  <Insight tone="positive" title="Reliability modelling">
                    The DNF model identifies retirements at {pct(ov.model_metrics.dnf.roc_auc, 1)} AUC, blending
                    constructor reliability with circuit chaos indices.
                  </Insight>
                </>
              ) : (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.15}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{season} title race</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="eyebrow mb-2.5">Drivers&rsquo; championship</p>
                <div className="space-y-1.5">
                  {(drivers ?? []).slice(0, 5).map((d) => (
                    <div key={d.driver_id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                      <span className="w-4 text-center font-mono text-xs text-faint">{d.position}</span>
                      <DriverAvatar id={d.driver_id!} name={d.full_name} size={28} />
                      <span className="flex-1 truncate text-sm text-foreground">{d.full_name}</span>
                      <span className="font-mono text-xs text-muted">{num(d.points)}</span>
                    </div>
                  ))}
                  {!drivers && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
                </div>
              </div>
              {ctorLeader && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3">
                  <Trophy className="size-4 text-gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-faint">Constructors&rsquo; leader</p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {flag(ctorLeader.nationality)} {ctorLeader.name}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-muted">{num(ctorLeader.points)}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/analytics">
                  Full standings <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
