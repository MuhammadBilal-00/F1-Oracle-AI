"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api";
import type { Driver, PredictionTarget } from "@/lib/types";

/** Query keys, centralised so caches invalidate consistently. */
export const qk = {
  drivers: ["drivers"] as const,
  driver: (id: number) => ["driver", id] as const,
  driverHistory: (id: number) => ["driver", id, "history"] as const,
  goat: (n: number) => ["goat", n] as const,
  clusters: ["clusters"] as const,
  races: (year?: number) => ["races", year ?? "all"] as const,
  seasons: ["seasons"] as const,
  raceResults: (id: number) => ["race", id, "results"] as const,
  predict: (id: number) => ["predict", id] as const,
  simulate: (id: number, n: number) => ["simulate", id, n] as const,
  featureImportance: (t: string) => ["feature-importance", t] as const,
  circuits: ["circuits"] as const,
  constructors: ["constructors"] as const,
  constructor: (id: number) => ["constructor", id] as const,
  constructorHistory: (id: number) => ["constructor", id, "history"] as const,
  circuitWinners: (id: number) => ["circuit", id, "winners"] as const,
  driverStandings: (y: number) => ["standings", "drivers", y] as const,
  constructorStandings: (y: number) => ["standings", "constructors", y] as const,
  rivalries: (n: number) => ["rivalries", n] as const,
  overview: ["overview"] as const,
};

export const useOverview = () => useQuery({ queryKey: qk.overview, queryFn: () => api.overview() });

export const useDrivers = () => useQuery({ queryKey: qk.drivers, queryFn: () => api.drivers() });
export const useDriver = (id?: number) =>
  useQuery({ queryKey: qk.driver(id!), queryFn: () => api.driver(id!), enabled: !!id });
export const useDriverHistory = (id?: number) =>
  useQuery({ queryKey: qk.driverHistory(id!), queryFn: () => api.driverHistory(id!), enabled: !!id });
export const useGoat = (n = 50) => useQuery({ queryKey: qk.goat(n), queryFn: () => api.goat(n) });
export const useClusters = () => useQuery({ queryKey: qk.clusters, queryFn: () => api.clusters() });

export const useSeasons = () => useQuery({ queryKey: qk.seasons, queryFn: () => api.seasons() });
export const useRaces = (year?: number) =>
  useQuery({ queryKey: qk.races(year), queryFn: () => api.races(year, 100) });
export const useRaceResults = (id?: number) =>
  useQuery({ queryKey: qk.raceResults(id!), queryFn: () => api.raceResults(id!), enabled: !!id });

export const usePrediction = (id?: number) =>
  useQuery({ queryKey: qk.predict(id!), queryFn: () => api.predict(id!), enabled: !!id });
export const useSimulation = (id: number | undefined, n: number, enabled: boolean) =>
  useQuery({ queryKey: qk.simulate(id!, n), queryFn: () => api.simulate(id!, n), enabled: enabled && !!id });
export const useFeatureImportance = (target: PredictionTarget = "race_winner") =>
  useQuery({ queryKey: qk.featureImportance(target), queryFn: () => api.featureImportance(target) });

export const useCircuits = () => useQuery({ queryKey: qk.circuits, queryFn: () => api.circuits() });
export const useConstructors = () =>
  useQuery({ queryKey: qk.constructors, queryFn: () => api.constructors() });
export const useConstructor = (id?: number) =>
  useQuery({ queryKey: qk.constructor(id!), queryFn: () => api.constructor(id!), enabled: !!id });
export const useConstructorHistory = (id?: number) =>
  useQuery({ queryKey: qk.constructorHistory(id!), queryFn: () => api.constructorHistory(id!), enabled: !!id });
export const useCircuitWinners = (id?: number) =>
  useQuery({ queryKey: qk.circuitWinners(id!), queryFn: () => api.circuitWinners(id!), enabled: !!id });
export const useDriverStandings = (year: number) =>
  useQuery({ queryKey: qk.driverStandings(year), queryFn: () => api.driverStandings(year) });
export const useConstructorStandings = (year: number) =>
  useQuery({ queryKey: qk.constructorStandings(year), queryFn: () => api.constructorStandings(year) });
export const useRivalries = (n = 20) =>
  useQuery({ queryKey: qk.rivalries(n), queryFn: () => api.rivalries(n) });

/**
 * Build an id -> Driver lookup. Prediction & simulation endpoints return
 * `driver_id` without names, so pages resolve names through this map.
 */
export function useDriverMap() {
  const { data, ...rest } = useDrivers();
  const map = useMemo(() => {
    const m = new Map<number, Driver>();
    data?.forEach((d) => m.set(d.driver_id, d));
    return m;
  }, [data]);
  return { map, drivers: data, ...rest };
}
