"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";

import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import { ExecutiveEmptyState, MetricCard } from "@/components/executive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getExecutiveSupplyDashboard,
  getSupplyKpiDrillDown,
} from "@/lib/supply/supply-enterprise-actions";
import type { ExecutiveSupplyBundle } from "@/lib/supply";
import type { SupplyKpiId } from "@/lib/supply/enterprise/types";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  initialBundle: ExecutiveSupplyBundle;
};

export function ExecutiveSupplyDashboard({
  tenantSlug,
  initialBundle,
}: Props) {
  const [bundle, setBundle] = useState(initialBundle);
  const [pending, startTransition] = useTransition();
  const [drill, setDrill] = useState<{
    id: SupplyKpiId;
    title: string;
    items: Array<{ id: string; label: string; value: number }>;
    total: number;
    error?: string;
  } | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  function refresh() {
    startTransition(async () => {
      const next = await getExecutiveSupplyDashboard(tenantSlug);
      setBundle(next);
    });
  }

  async function openDrill(definitionId: SupplyKpiId, title: string) {
    setDrillLoading(true);
    setDrill({ id: definitionId, title, items: [], total: 0 });
    try {
      const res = await getSupplyKpiDrillDown(tenantSlug, definitionId);
      setDrill({
        id: definitionId,
        title,
        items: res.items.map((i) => ({
          id: i.id,
          label: i.label,
          value: i.value,
        })),
        total: res.total,
      });
    } catch (e) {
      setDrill({
        id: definitionId,
        title,
        items: [],
        total: 0,
        error: e instanceof Error ? e.message : "Falha no drill-down",
      });
    } finally {
      setDrillLoading(false);
    }
  }

  const healthEntries = Object.entries(bundle.health ?? {});

  return (
    <div className="space-y-6">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/executivo"
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={cn(gofTypography.title)}>
            Compras & Supply Chain Enterprise
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estoque, compras e almoxarifado sobre as bases canônicas — sem dados
            fictícios.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Atualizado: {bundle.updatedAt} · Provider: {bundle.provider.label}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={refresh}
            disabled={pending}
          >
            Atualizar
          </Button>
          <Link href={`/${tenantSlug}/estoque/dashboard`}>
            <Button type="button" variant="secondary">
              Estoque operacional
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={bundle.context.warehouseReady ? "default" : "outline"}>
          Almoxarifado {bundle.context.warehouseReady ? "pronto" : "aguardando schema"}
        </Badge>
        <Badge
          variant={
            bundle.context.purchaseWorkflowReady ? "default" : "outline"
          }
        >
          Compras {bundle.context.purchaseWorkflowReady ? "pronto" : "aguardando schema"}
        </Badge>
        <Badge variant="outline">
          Produtos no snapshot: {bundle.productsCount}
        </Badge>
      </div>

      {pending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : bundle.highlighted.length === 0 ? (
        <ExecutiveEmptyState
          title="Sem indicadores disponíveis"
          description="Não há dados canônicos suficientes no período."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {bundle.highlighted.map((kpi) =>
            kpi ? (
              <button
                key={kpi.definitionId}
                type="button"
                className="text-left"
                disabled={!kpi.drillDownAvailable}
                onClick={() =>
                  kpi.drillDownAvailable &&
                  openDrill(kpi.definitionId as SupplyKpiId, kpi.name)
                }
              >
                <MetricCard
                  label={kpi.name}
                  value={kpi.formatted}
                  hint={
                    kpi.availability === "unavailable"
                      ? kpi.unavailableReason
                      : kpi.source
                  }
                />
              </button>
            ) : null,
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" />
              Alertas
            </CardTitle>
            <CardDescription>Derivados apenas de KPIs resolvidos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bundle.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta.</p>
            ) : (
              bundle.alerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.title}</span>
                    <Badge variant="outline">{a.severity}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{a.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Inteligência determinística
            </CardTitle>
            <CardDescription>
              Sugestões com base em saldos e consumo existentes — sem inventar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bundle.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem insights no momento.
              </p>
            ) : (
              bundle.insights.slice(0, 8).map((ins) => (
                <div
                  key={ins.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="font-medium">{ins.title}</div>
                  <p className="mt-1 text-muted-foreground">{ins.detail}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {drill ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drill-down · {drill.title}</CardTitle>
            <CardDescription>
              {drillLoading
                ? "Carregando…"
                : `${drill.total} item(ns) · origem canônica`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {drill.error ? (
              <p className="text-sm text-destructive">{drill.error}</p>
            ) : drill.items.length === 0 && !drillLoading ? (
              <p className="text-sm text-muted-foreground">Sem linhas.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                {drill.items.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-3 border-b py-1"
                  >
                    <span>{i.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {i.value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {healthEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saúde das fontes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {healthEntries.map(([k, v]) => (
              <Badge key={k} variant="outline">
                {k}: {v.status}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
