import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

/** Deterministic accent ring colour per driver, for visual continuity in lists/charts. */
const PALETTE = [
  "#ff2e3f", "#5b9bff", "#34d399", "#f5b544", "#9a7cff", "#46c6e0", "#ff7ab6", "#f5c451",
];

export function driverColor(id: number): string {
  return PALETTE[id % PALETTE.length];
}

export function DriverAvatar({
  id,
  name,
  size = 36,
  className,
}: {
  id: number;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const color = driverColor(id);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-foreground",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `${color}1f`,
        border: `1px solid ${color}55`,
        color,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
