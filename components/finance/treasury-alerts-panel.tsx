"use client";

import Link from "next/link";

import type { TreasuryAlert } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

function severityMeta(severity: TreasuryAlert["severity"]) {
  if (severity === "critical") {
    return { label: "Crítico", variant: "destructive" as const };
  }
  if (severity === "warning") {
    return { label: "Atenção", variant: "warning" as const };
  }
  return { label: "Informativo", variant: "secondary" as const };
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Props = {
  alerts: TreasuryAlert[];
  className?: string;
};

export function TreasuryAlertsPanel({ alerts, className }: Props) {
  return (
    <Card
      data-treasury-alerts-panel
      className={cn("border-border/40 shadow-sm ring-1 ring-border/10", className)}
    >
      <CardHeader>
        <CardTitle className="text-base">Alertas financeiros</CardTitle>
        <CardDescription>
          Saúde do caixa e riscos operacionais
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="Nenhum alerta no momento"
            description="Monitoramos saldos, concentração e ausência de entradas."
            className="border-0 bg-transparent py-6 shadow-none"
          />
        ) : (
          <ul className="space-y-2.5">
            {alerts.map((a) => {
              const sev = severityMeta(a.severity);
              return (
                <li
                  key={a.id}
                  className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{a.title}</p>
                    <Badge variant={sev.variant}>{sev.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {a.description}
                  </p>
                  <p className="mt-1.5 text-xs text-foreground">
                    <span className="text-muted-foreground">Ação recomendada: </span>
                    {a.recommendedAction}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <time
                      className="text-[11px] text-muted-foreground"
                      dateTime={a.createdAt}
                    >
                      {formatWhen(a.createdAt)}
                    </time>
                    {a.href ? (
                      <Button
                        variant="outline"
                        size="xs"
                        render={<Link href={a.href} />}
                      >
                        Abrir
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
