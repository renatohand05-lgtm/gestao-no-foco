import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardStat } from "@/types/dashboard";

type StatCardProps = {
  stat: DashboardStat;
};

const trendStyles = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  neutral: "text-muted-foreground",
};

const trendIcons = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
};

export function StatCard({ stat }: StatCardProps) {
  const TrendIcon = trendIcons[stat.trend];

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <stat.icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {stat.value}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trendStyles[stat.trend],
            )}
          >
            <TrendIcon className="size-3.5" />
            {stat.change}
          </span>
          <span className="text-muted-foreground">{stat.description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
