/**
 * F1 Oracle AI — API response types.
 * These mirror the FastAPI backend contract exactly (verified against live responses).
 */

export interface CareerStats {
  driver_id?: number;
  total_races: number;
  total_wins: number;
  total_podiums: number;
  total_top10: number;
  total_points: number;
  total_dnf: number;
  avg_finish_position: number;
  finish_std: number;
  win_rate: number;
  podium_rate: number;
  top10_rate: number;
  dnf_rate: number;
  avg_positions_gained: number;
  overtake_efficiency: number;
  avg_points_per_race: number;
  avg_grid_position?: number;
  quali_race_delta?: number;
  consistency_score: number;
  years_active?: number;
  first_year?: number;
  last_year?: number;
  career_length?: number;
}

export interface Driver {
  driver_id: number;
  driver_ref?: string;
  number?: number | null;
  code?: string | null;
  forename: string;
  surname: string;
  full_name: string;
  dob?: string | null;
  nationality: string;
  url?: string;
  career_stats?: CareerStats;
  goat_rank?: number;
  goat_score?: number;
  archetype?: string;
}

export interface GoatEntry {
  goat_rank: number;
  driver_id: number;
  full_name?: string;
  nationality?: string;
  goat_score: number;
  total_wins: number;
  win_rate: number;
  podium_rate: number;
  consistency_score: number;
  total_races: number;
  career_length: number;
}

export interface DriverHistoryEntry {
  race_id: number;
  year: number;
  round: number;
  race_name: string;
  circuit_name: string;
  country: string;
  position: number | null;
  grid: number | null;
  points: number | null;
  laps: number | null;
  positions_gained: number | null;
  finished: number;
  status: string | null;
}

export interface DriverCluster {
  driver_id: number;
  full_name?: string;
  nationality?: string;
  cluster: number;
  cluster_label: string;
  pca_x: number;
  pca_y: number;
  tsne_x: number;
  tsne_y: number;
  win_rate: number;
  podium_rate: number;
  dnf_rate: number;
  consistency_score: number;
  avg_points_per_race: number;
  total_races: number;
  total_wins: number;
  career_length: number;
  [key: string]: unknown;
}

export interface ConstructorShort {
  constructor_id: number;
  constructor_ref?: string;
  name: string;
  nationality?: string;
  url?: string;
}

export interface ConstructorPerformance {
  constructor_id: number;
  total_race_entries: number;
  total_wins: number;
  total_podiums: number;
  total_points: number;
  avg_finish_position: number;
  reliability_score: number;
  dnf_rate: number;
  avg_pit_duration_s: number;
  pit_consistency_s: number;
  win_rate: number;
  podium_rate: number;
  avg_positions_gained: number;
  years_active: number;
  first_year: number;
  last_year: number;
}

export interface Constructor extends ConstructorShort {
  performance?: ConstructorPerformance;
}

export interface ConstructorSeason {
  year: number;
  points: number | null;
  position: number | null;
  wins: number | null;
}

export interface CircuitWinner {
  year: number;
  race_name: string;
  driver_id: number;
  winner: string;
  constructor_name: string;
  grid: number | null;
  laps: number | null;
}

export interface Race {
  race_id: number;
  year: number;
  round: number;
  name: string;
  date?: string | null;
  circuit_name: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
}

export interface RaceResult {
  result_id: number;
  driver_id: number;
  full_name: string;
  nationality: string;
  constructor_id: number;
  constructor_name: string;
  position: number | null;
  grid: number | null;
  points: number;
  laps: number | null;
  time_text: string | null;
  fastest_lap_time: string | null;
  fastest_lap_speed: number | null;
  positions_gained: number | null;
  finished: number;
  status: string | null;
}

export interface Circuit {
  circuit_id: number;
  circuit_ref?: string;
  name: string;
  location: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  alt?: number | null;
  total_races_hosted?: number;
  avg_dnf_rate?: number;
  avg_positions_changed?: number;
  overtake_index?: number;
  avg_field_spread?: number;
  avg_pit_stops_per_race?: number;
  circuit_chaos_index?: number;
  [key: string]: unknown;
}

export interface Rivalry {
  driver_id_1: number;
  driver_id_2: number;
  driver_1_name: string;
  driver_2_name: string;
  shared_races: number;
  d1_wins: number;
  d2_wins: number;
  years_together: number;
  d1_win_pct: number;
  rivalry_intensity: number;
}

export interface Standing {
  driver_id?: number;
  constructor_id?: number;
  full_name?: string;
  name?: string;
  nationality: string;
  points: number;
  position: number;
  wins: number;
}

export interface DriverPrediction {
  driver_id: number;
  grid_position: number;
  win_probability: number;
  podium_probability: number;
  top10_probability: number;
  dnf_probability: number;
  predicted_position: number;
}

export interface PredictionResult {
  race_id: number;
  drivers: DriverPrediction[];
}

export interface SimulationEntry {
  driver_id: number;
  name: string;
  win_probability: number;
  podium_probability: number;
  top5_probability: number;
  top10_probability: number;
  dnf_probability: number;
  avg_finish: number;
  finish_std: number;
  avg_pit_stops: number;
  simulations: number;
  predicted_rank: number;
}

export interface SimulationResult {
  race_id: number;
  n_simulations: number;
  results: SimulationEntry[];
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export type PredictionTarget = "race_winner" | "podium" | "top10" | "dnf";

export interface ModelMetric {
  roc_auc: number;
  best_model: string;
  models: Record<string, number>;
}

export interface Overview {
  total_races: number;
  total_drivers: number;
  total_circuits: number;
  total_constructors: number;
  total_seasons: number;
  first_year: number;
  last_year: number;
  total_results: number;
  model_metrics: Record<PredictionTarget, ModelMetric>;
}
