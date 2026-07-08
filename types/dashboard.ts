import type { LucideIcon } from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

export type DashboardStat = {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: TrendDirection;
  description: string;
  icon: LucideIcon;
};

export type WeeklyDataPoint = {
  label: string;
  value: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  tone: "default" | "success" | "warning" | "info";
};

export type AlertItem = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
};

export type SetupStep = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

export type DashboardData = {
  greeting: string;
  subtitle: string;
  periodLabel: string;
  stats: DashboardStat[];
  weeklyOverview: WeeklyDataPoint[];
  activities: ActivityItem[];
  alerts: AlertItem[];
  setupSteps: SetupStep[];
};
