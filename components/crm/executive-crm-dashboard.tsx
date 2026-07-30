"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";

import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
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
  getCrmKpiDrillDown,
  getExecutiveCrmDashboard,
} from "@/lib/crm/crm-enterprise-actions";
import type { ExecutiveCrmBundle } from "@/lib/crm";
import type { CrmKpiId } from "@/lib/crm/enterprise/types";
import { CRM_FUNIL_LABELS, type CrmFunilStage } from "@/lib/crm/constants";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  initialBundle: ExecutiveCrmBundle;
};

export function ExecutiveCrmDashboard({ tenantSlug, initialBundle }: Props) {
  const [bundle, setBundle] = useState(initialBundle);
  const [pending, startTransition] = useTransition();
  const [drill, setDrill] = useState<{
    id: CrmKpiId;
    title: string;
    items: Array<{ id: string; label: string; value: number }>;
    total: number;
    error?: string;
  } | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  function refresh() {
    startTransition(async () => {
      const next = await getExecutiveCrmDashboard(tenantSlug);
      setBundle(next);
    });
  }

  async function openDrill(definitionId: CrmKpiId, title: string) {
    setDrillLoading(true);
    setDrill({ id: definitionId, title, items: [], total: 0 });
    try {
      const res = await getCrmKpiDrillDown(tenantSlug, definitionId);
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

  return (
    <div className="space-y-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/executivo" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={cn(gofTypography.title)}>CRM Enterprise</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relacionamento executivo sobre a base única de clientes — sem dados
            fictícios.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Atualizado: {bundle.updatedAt} · Provider: {bundle.provider.label}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={refresh} disabled={pending}>
            Atualizar
          </Button>
          <Link
            href={`/${tenantSlug}/clientes`}
            className="inline-flex h-9 items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cadastro de clientes
          </Link>
        </div>
      </div>

      {Object.entries(bundle.sourceHealth).some(
        ([, h]) => h.status === "error",
      ) ? (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Algumas fontes falharam (isoladas)</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {Object.entries(bundle.sourceHealth)
                .filter(([, h]) => h.status === "error")
                .map(([k, h]) => (
                  <li key={k}>
                    {k}: {h.message}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ) : null}

      {bundle.empty ? (
        <ExecutiveEmptyState
          title="Sem dados CRM suficientes"
          description="Cadastre clientes, mova o funil ou registre vendas/OS para popular o dashboard."
        />
      ) : null}

      <section aria-label="Indicadores CRM">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Indicadores
        </h2>
        {pending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bundle.highlighted.map((k) =>
              k ? (
                <button
                  key={k.definitionId}
                  type="button"
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Drill-down ${k.name}`}
                  disabled={!k.drillDownAvailable}
                  onClick={() =>
                    k.drillDownAvailable &&
                    openDrill(k.definitionId as CrmKpiId, k.name)
                  }
                >
                  <MetricCard
                    label={k.name}
                    value={k.formatted}
                    tone={
                      k.availability === "unavailable" ? "neutral" : "info"
                    }
                  />
                </button>
              ) : null,
            )}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funil comercial</CardTitle>
            <CardDescription>
              Etapas canônicas (Qualificado = estágio DB contato)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.pipeline.map((stage) => {
              const stats = bundle.funil.find((f) => f.estagio === stage.key);
              return (
                <div
                  key={stage.key}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-muted-foreground">
                    {stats?.total ?? 0} ·{" "}
                    {(stats?.valor_total ?? 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              );
            })}
            {!bundle.funil.length ? (
              <p className="text-sm text-muted-foreground">
                Funil sem contagens — Dados indisponíveis nesta fonte.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden />
              IA comercial
            </CardTitle>
            <CardDescription>{bundle.provider.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bundle.insights.slice(0, 5).map((insight) => (
              <div key={insight.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{insight.title}</p>
                <p className="mt-1 text-muted-foreground">{insight.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">confiança: {insight.confidence}</Badge>
                  {insight.limitations.slice(0, 1).map((l) => (
                    <Badge key={l} variant="secondary">
                      limitação
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {!bundle.insights.length ? (
              <p className="text-sm text-muted-foreground">
                Evidência insuficiente para insights.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>Sem ação automática</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.alerts.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      a.severity === "critical"
                        ? "destructive"
                        : a.severity === "attention"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {a.severity}
                  </Badge>
                  <span className="font-medium">{a.title}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{a.description}</p>
                <p className="mt-1 text-xs">Sugestão: {a.recommendation}</p>
              </div>
            ))}
            {!bundle.alerts.length ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta com evidência.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking / Follow-ups</CardTitle>
            <CardDescription>
              Follow-ups pendentes:{" "}
              {bundle.followUpsPendentes == null
                ? "Dados indisponíveis"
                : bundle.followUpsPendentes}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {bundle.ranking.slice(0, 15).map((r) => (
                <li key={r.id} className="flex justify-between gap-2 border-b py-1">
                  <Link
                    href={`/${tenantSlug}/clientes/${r.id}`}
                    className="truncate underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {r.nome}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">
                    {r.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </li>
              ))}
              {!bundle.ranking.length ? (
                <li className="text-muted-foreground">Ranking indisponível nesta carga.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      {drill ? (
        <Card role="dialog" aria-modal="true" aria-label="Drill-down CRM">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Drill-down: {drill.title}</CardTitle>
              <CardDescription>
                Total: {drill.total.toLocaleString("pt-BR")}
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" onClick={() => setDrill(null)}>
              Fechar (Esc)
            </Button>
          </CardHeader>
          <CardContent>
            {drillLoading ? <Skeleton className="h-24 w-full" /> : null}
            {drill.error ? (
              <p className="text-sm text-destructive">{drill.error}</p>
            ) : null}
            {!drillLoading && !drill.error && !drill.items.length ? (
              <p className="text-sm text-muted-foreground">
                Dados indisponíveis para detalhe rastreável.
              </p>
            ) : null}
            <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
              {drill.items.map((i) => (
                <li key={i.id} className="flex justify-between border-b py-1">
                  <span>{i.label in CRM_FUNIL_LABELS ? CRM_FUNIL_LABELS[i.label as CrmFunilStage] : i.label}</span>
                  <span>{i.value.toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
