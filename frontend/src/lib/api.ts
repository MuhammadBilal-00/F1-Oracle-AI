/**
 * F1 Oracle AI — typed HTTP client for the FastAPI backend.
 * All network access funnels through `request()` for consistent error handling.
 */
import type {
  Driver, GoatEntry, DriverHistoryEntry, DriverCluster,
  Constructor, ConstructorShort, Race, RaceResult, Circuit,
  Rivalry, Standing, PredictionResult, SimulationResult,
  FeatureImportance, PredictionTarget, Overview,
  ConstructorSeason, CircuitWinner,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Unable to reach the F1 Oracle API. Is the backend running?");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // ─── Drivers ──────────────────────────────────────────────
  drivers: (params?: { search?: string; limit?: number }) =>
    request<Driver[]>(`/drivers/${qs({ search: params?.search, limit: params?.limit ?? 2000 })}`),
  driver: (id: number) => request<Driver>(`/drivers/${id}`),
  driverHistory: (id: number) => request<DriverHistoryEntry[]>(`/drivers/${id}/history`),
  goat: (topN = 50) => request<GoatEntry[]>(`/drivers/goat${qs({ top_n: topN })}`),
  clusters: () => request<DriverCluster[]>(`/drivers/clusters`),

  // ─── Races ────────────────────────────────────────────────
  races: (year?: number, limit = 100) =>
    request<Race[]>(`/races/${qs({ year, limit })}`),
  seasons: () => request<number[]>(`/races/seasons`),
  raceResults: (raceId: number) => request<RaceResult[]>(`/races/${raceId}/results`),

  // ─── Predictions & simulation ─────────────────────────────
  predict: (raceId: number) => request<PredictionResult>(`/predictions/race/${raceId}`),
  simulate: (raceId: number, n = 1000) =>
    request<SimulationResult>(`/predictions/race/${raceId}/simulate${qs({ n_simulations: n })}`),
  featureImportance: (target: PredictionTarget = "race_winner") =>
    request<{ target: string; features: FeatureImportance[] }>(
      `/predictions/feature-importance/${target}`,
    ),
  predictCustom: (circuit_id: number, entries: { driver_id: number; grid: number }[]) =>
    request<{ circuit_id: number; drivers: PredictionResult["drivers"] }>(`/predictions/custom`, {
      method: "POST",
      body: JSON.stringify({ circuit_id, entries }),
    }),

  // ─── Analytics ────────────────────────────────────────────
  overview: () => request<Overview>(`/analytics/overview`),
  circuits: () => request<Circuit[]>(`/analytics/circuits`),
  circuitWinners: (id: number, limit = 15) =>
    request<CircuitWinner[]>(`/analytics/circuits/${id}/winners${qs({ limit })}`),
  constructors: () => request<ConstructorShort[]>(`/analytics/constructors`),
  constructor: (id: number) => request<Constructor>(`/analytics/constructors/${id}`),
  constructorHistory: (id: number) =>
    request<ConstructorSeason[]>(`/analytics/constructors/${id}/history`),
  driverStandings: (year: number) => request<Standing[]>(`/analytics/standings/drivers/${year}`),
  constructorStandings: (year: number) =>
    request<Standing[]>(`/analytics/standings/constructors/${year}`),
  rivalries: (topN = 20) => request<Rivalry[]>(`/analytics/rivalries${qs({ top_n: topN })}`),
};
