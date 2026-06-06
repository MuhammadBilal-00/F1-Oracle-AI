"use client";

import { Code2, Server, SlidersHorizontal, Info, Cpu } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIStatus } from "@/components/layout/ai-status";
import { useSeasons, useOverview } from "@/hooks/use-f1";
import { useUI } from "@/store/ui-store";
import { API_BASE } from "@/lib/api";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const STACK = ["Next.js", "React", "TypeScript", "Tailwind", "FastAPI", "XGBoost", "LightGBM", "CatBoost", "SHAP"];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-accent" : "bg-surface-2 border border-border")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

export default function SettingsPage() {
  const { data: seasons } = useSeasons();
  const { data: ov } = useOverview();
  const { season, setSeason, sidebarPinned, togglePinned } = useUI();

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Preferences" title="Settings" description="Configure your defaults and review the platform connection and capabilities." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Preferences */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-subtle" /> Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Row label="Default season" hint="Used across analytics and standings.">
              <Select value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
                <SelectTrigger size="sm" className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>{(seasons ?? [season]).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Pin sidebar" hint="Keep the navigation expanded.">
              <Toggle on={sidebarPinned} onClick={togglePinned} />
            </Row>
            <Row label="Theme" hint="Dark mode is tuned for long sessions.">
              <Badge variant="neutral">Dark</Badge>
            </Row>
          </CardContent>
        </Card>

        {/* Connection */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Server className="size-4 text-subtle" /> Connection</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Row label="API status">
              <AIStatus />
            </Row>
            <div>
              <p className="text-sm text-foreground">API endpoint</p>
              <p className="mt-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-muted">{API_BASE}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About */}
      <Card hero>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="size-4 text-subtle" /> About F1 Oracle AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            A premium Formula 1 machine-learning platform spanning{" "}
            {ov ? `${ov.first_year}–${ov.last_year}` : "1950–2024"} — {ov ? num(ov.total_races) : "1,125"} Grands Prix,
            {" "}{ov ? num(ov.total_drivers) : "861"} drivers and {ov ? num(ov.total_results) : "26,759"} results,
            powered by a gradient-boosting ensemble and Monte Carlo simulation.
          </p>

          {ov?.model_metrics && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(ov.model_metrics).map(([k, m]) => (
                <div key={k} className="rounded-xl border border-border bg-surface-2/50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] capitalize text-subtle"><Cpu className="size-3" /> {k.replace("_", " ")}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground tnum">{pct(m.roc_auc, 1)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {STACK.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <a href={`${API_BASE.replace(/\/api\/v1\/?$/, "")}/docs`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm text-muted transition-colors hover:text-foreground">
              <Server className="size-4" /> API docs
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm text-muted transition-colors hover:text-foreground">
              <Code2 className="size-4" /> Source
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="text-xs text-subtle">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
