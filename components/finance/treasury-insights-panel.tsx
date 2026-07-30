"use client";

import type { TreasuryInsight } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function severityFromTone(
  tone: TreasuryInsight["tone"],
): { label: string; variant: "success" | "warning" | "outline" | "secondary" } {
  if (tone === "positive") return { label: "Positivo", variant: "success" };
  if (tone === "critical") return { label: "Crítico", variant: "warning" };
  return { label: "Informativo", variant: "secondary" };
}

type Props = {
  insights: TreasuryInsight[];
  className?: string;
};

export function TreasuryInsightsPanel({ insights, className }: Props) {
  return (
    <Card
      data-treasury-insights-panel
      className={cn("border-border/40 shadow-sm ring-1 ring-border/10", className)}
    >
      <CardHeader>
        <CardTitle className="text-base">Insights</CardTitle>
        <CardDescription>
          Regras determinísticas · sem IA generativa
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="Sem insights no período"
            description="Quando houver movimentações relevantes, os indicadores aparecem aqui."
            className="border-0 bg-transparent py-6 shadow-none"
          />
        ) : (
          <ul className="space-y-2.5">
            {insights.map((i) => {
              const sev = severityFromTone(i.tone);
              return (
                <li
                  key={i.id}
                  className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {i.title}
                    </p>
                    <Badge variant={sev.variant}>{sev.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {i.description}
                  </p>
                  {i.metricValue != null ? (
                    <p className="mt-1.5 text-xs tabular-nums text-foreground">
                      {i.metricLabel ? `${i.metricLabel}: ` : "Impacto: "}
                      {money(i.metricValue)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
