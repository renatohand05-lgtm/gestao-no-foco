import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types/dashboard";

type RecentActivityFeedProps = {
  activities: ActivityItem[];
};

const toneStyles = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Atividades recentes
        </CardTitle>
        <CardDescription>
          Últimas movimentações do seu negócio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={cn(
              "flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50",
              index !== activities.length - 1 && "border-b border-border/50",
            )}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                toneStyles[activity.tone],
              )}
            >
              <activity.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{activity.title}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {activity.time}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {activity.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
