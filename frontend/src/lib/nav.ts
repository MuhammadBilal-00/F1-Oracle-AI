import {
  LayoutDashboard, Target, Dices, Users, Building2, Route, LineChart,
  FlaskConical, Settings, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/** Primary navigation — max 8 items per the product spec. */
export const NAV: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard, description: "Platform snapshot & insights" },
  { label: "AI Predictions", href: "/predictions", icon: Target, description: "Race outcome predictions with SHAP" },
  { label: "Race Simulator", href: "/simulator", icon: Dices, description: "Monte Carlo race simulation" },
  { label: "Drivers", href: "/drivers", icon: Users, description: "Career analytics & GOAT scores" },
  { label: "Constructors", href: "/constructors", icon: Building2, description: "Team performance & reliability" },
  { label: "Circuits", href: "/circuits", icon: Route, description: "Track intelligence profiles" },
  { label: "Historical Analytics", href: "/analytics", icon: LineChart, description: "Seasons, standings & rivalries" },
  { label: "Research Lab", href: "/research", icon: FlaskConical, description: "Clustering, PCA & feature analysis" },
];

export const SETTINGS_ITEM: NavItem = {
  label: "Settings", href: "/settings", icon: Settings, description: "Preferences & about",
};
