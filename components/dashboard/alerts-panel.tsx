import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AlertItem } from "@/types/dashboard";

type AlertsPanelProps = {
  alerts: AlertItem[];
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
} as const;

const priorityVariants = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
} as const;

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-amber-500" />
          Alertas
        </CardTitle>
        <CardDescription>Itens que merecem atenção</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-lg border border-border/60 bg-muted/20 p-3"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{alert.title}</p>
              <Badge variant={priorityVariants[alert.priority]} className="text-[10px]">
                {priorityLabels[alert.priority]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{alert.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
