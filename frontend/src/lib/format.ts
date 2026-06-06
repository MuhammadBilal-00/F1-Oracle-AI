/** Display formatting helpers — keep all number/string presentation logic here. */

/** 0.2949 -> "29.5%" */
export function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** 4820.5 -> "4,820" | 13.54 -> "13.5" */
export function num(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 1 -> "1st", 2 -> "2nd", 23 -> "23rd" */
export function ordinal(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const v = Math.round(n);
  const s = ["th", "st", "nd", "rd"];
  const k = v % 100;
  return v + (s[(k - 20) % 10] || s[k] || s[0]);
}

/** Compact large numbers: 4820 -> "4.8K", 1_200_000 -> "1.2M" */
export function compact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Initials from a full name: "Lewis Hamilton" -> "LH" */
export function initials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Three-letter racing code fallback derived from surname. */
export function driverCode(name: string | null | undefined, code?: string | null): string {
  if (code) return code.toUpperCase();
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].slice(0, 3).toUpperCase();
}

/** ISO date -> "5 Mar 2023" */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/** Age in years from a DOB. */
export function ageFrom(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

/** Country -> flag emoji via a small nationality lookup. */
const NATION_TO_ISO: Record<string, string> = {
  British: "GB", German: "DE", Dutch: "NL", Spanish: "ES", French: "FR",
  Italian: "IT", Finnish: "FI", Australian: "AU", Mexican: "MX", Brazilian: "BR",
  Canadian: "CA", Austrian: "AT", Monegasque: "MC", Belgian: "BE", Danish: "DK",
  Japanese: "JP", Thai: "TH", American: "US", Argentine: "AR", "New Zealander": "NZ",
  Swedish: "SE", Swiss: "CH", Polish: "PL", Russian: "RU", Portuguese: "PT",
  Indian: "IN", Hungarian: "HU", "South African": "ZA", Irish: "IE", Chinese: "CN",
  Venezuelan: "VE", Colombian: "CO", Indonesian: "ID", Malaysian: "MY", Czech: "CZ",
};

export function flag(nationality: string | null | undefined): string {
  if (!nationality) return "🏁";
  const iso = NATION_TO_ISO[nationality];
  if (!iso) return "🏁";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
