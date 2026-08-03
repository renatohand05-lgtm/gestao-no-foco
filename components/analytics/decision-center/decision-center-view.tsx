"use client";

import Link from "next/link";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DecisionCenterPack } from "@/lib/analytics/decision-center/types";
import { cn } from "@/lib/utils";

type Props = {
  pack: DecisionCenterPack;
};

function SignalTile({
  title,
  card,
}: {
  title: string;
  card: DecisionCenterPack["brief"]["biggestGrowth"];
}) {
  if (!card) {
    return (
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="mt-1">Sem evidência no período</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:border-primary/30">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 font-medium">{card.metricName ?? card.label}</p>
      <p className="tabular-nums text-lg font-semibold">{card.valueLabel}</p>
      {card.deltaPercent != null ? (
        <p
          className={cn(
            "text-xs tabular-nums",
            card.direction === "up" && "text-emerald-700 dark:text-emerald-400",
            card.direction === "down" && "text-red-700 dark:text-red-400",
          )}
        >
          {card.deltaPercent >= 0 ? "+" : ""}
          {card.deltaPercent}% · {card.direction}
        </p>
      ) : null}
      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {card.evidence}
      </p>
      {card.href ? (
        <Link
          href={card.href}
          className="mt-2 inline-block text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver detalhe
        </Link>
      ) : null}
    </div>
  );
}

const HEALTH_TONE: Record<string, string> = {
  excelente: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  bom: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  atencao: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  critico: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

const PRIORITY_TONE: Record<string, string> = {
  critica: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  alta: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  media: "bg-muted text-muted-foreground",
  baixa: "bg-muted text-muted-foreground",
};

export function DecisionCenterView({ pack }: Props) {
  const { brief, trends, insights, forecast, decisions, kpiHealth, comparatives, alerts, report } =
    pack;

  function exportReport() {
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-executivo-${report.periodLabel.replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6" data-analytics-decision-center="" data-sprint="30.6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Centro de Inteligência Executiva
          </h2>
          <p className="text-sm text-muted-foreground">
            Insights, previsões e decisões com evidências reais — sem IA generativa.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={exportReport}
          aria-label="Exportar relatório executivo"
        >
          <Download className="mr-1 size-3.5" aria-hidden />
          Relatório
        </Button>
      </div>

      {brief.nextAction ? (
        <Card className="border-primary/30" data-dc-block="next-action">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próxima ação sugerida</CardTitle>
            <CardDescription>{brief.nextAction.reason}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge className={PRIORITY_TONE[brief.nextAction.priority]}>
              {brief.nextAction.priority}
            </Badge>
            <p className="text-sm font-medium">{brief.nextAction.title}</p>
            <Link
              href={brief.nextAction.href}
              className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ir para ação
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section
        aria-label="Sinais executivos"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        data-dc-block="executive-intelligence"
      >
        <SignalTile title="Maior crescimento" card={brief.biggestGrowth} />
        <SignalTile title="Maior queda" card={brief.biggestDrop} />
        <SignalTile title="Maior risco" card={brief.biggestRisk} />
        <SignalTile title="Maior oportunidade" card={brief.biggestOpportunity} />
        <SignalTile title="Indicador mais crítico" card={brief.mostCritical} />
        <SignalTile title="Indicador mais saudável" card={brief.healthiest} />
        <div className="rounded-lg border bg-card p-3 sm:col-span-2">
          <p className="text-xs text-muted-foreground">O que melhorou</p>
          <ul className="mt-2 space-y-1 text-sm">
            {brief.improved.length === 0 ? (
              <li className="text-muted-foreground">Sem evidência positiva</li>
            ) : (
              brief.improved.map((i) => (
                <li key={i.id}>
                  {i.metricName}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    ({i.deltaPercent ?? "—"}%)
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-3 sm:col-span-2">
          <p className="text-xs text-muted-foreground">O que piorou</p>
          <ul className="mt-2 space-y-1 text-sm">
            {brief.worsened.length === 0 ? (
              <li className="text-muted-foreground">Sem evidência negativa</li>
            ) : (
              brief.worsened.map((i) => (
                <li key={i.id}>
                  {i.metricName}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    ({i.deltaPercent ?? "—"}%)
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-dc-block="forecast">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previsão (matemática)</CardTitle>
            <CardDescription>
              Média / tendência linear · nunca apresentada como certeza
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {forecast.map((f) => (
              <div key={f.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{f.label}</span>
                  <span className="tabular-nums font-semibold">{f.formatted}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {f.methodology} · confiança {f.confidence}
                </p>
                {f.limitations[0] ? (
                  <p className="text-[11px] text-muted-foreground">{f.limitations[0]}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-dc-block="kpi-health">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saúde dos indicadores</CardTitle>
            <CardDescription>Excelente · Bom · Atenção · Crítico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {kpiHealth.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem KPIs disponíveis.</p>
            ) : (
              kpiHealth.slice(0, 10).map((k) => (
                <div
                  key={k.metricId}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-[11px] text-muted-foreground">{k.reason}</p>
                    <p className="text-[11px] text-muted-foreground">{k.historyHint}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] uppercase",
                        HEALTH_TONE[k.level],
                      )}
                    >
                      {k.level}
                    </span>
                    <p className="mt-1 tabular-nums text-xs">{k.formatted}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-dc-block="decision-center">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Decision Center</CardTitle>
          <CardDescription>
            Problema · impacto · evidência · recomendação · prioridade · ação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma decisão priorizada — sem alertas ou deteriorações no período.
            </p>
          ) : (
            decisions.map((d) => (
              <article
                key={d.id}
                className="rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={PRIORITY_TONE[d.priority]}>{d.priority}</Badge>
                  <span className="text-xs text-muted-foreground">{d.category}</span>
                </div>
                <p className="mt-1 font-medium">{d.problem}</p>
                <p className="text-xs text-muted-foreground">Impacto: {d.impact}</p>
                <p className="mt-1 text-xs">Evidência: {d.evidence}</p>
                <p className="mt-1 text-xs font-medium">Recomendação: {d.recommendation}</p>
                <Link
                  href={d.href}
                  className="mt-1 inline-block text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Abrir ação
                </Link>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-dc-block="insights">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Business Insights</CardTitle>
            <CardDescription>Regras determinísticas sobre o período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem insights no período.</p>
            ) : (
              insights.map((i) => (
                <div key={i.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{i.title}</span>
                    {i.impactLabel ? (
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {i.impactLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{i.evidence}</p>
                  {i.href ? (
                    <Link
                      href={i.href}
                      className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Ver
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card data-dc-block="alerts">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertas executivos</CardTitle>
            <CardDescription>
              Impacto · gravidade · urgência · responsável · prazo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta aberto.</p>
            ) : (
              alerts.slice(0, 8).map((a) => (
                <div key={a.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{a.gravity}</Badge>
                    <Badge variant="outline">{a.urgency}</Badge>
                    <Badge variant="outline">{a.category}</Badge>
                  </div>
                  <p className="mt-1 font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Impacto fin.:{" "}
                    {a.financialImpact == null
                      ? "—"
                      : a.financialImpact.toLocaleString("pt-BR")}{" "}
                    · Resp.: {a.responsible ?? "—"} · Prazo: {a.deadline ?? "—"}
                  </p>
                  <Link
                    href={a.href}
                    className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Tratar
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-dc-block="trends">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Análise temporal</CardTitle>
          <CardDescription>
            Comparativo do período selecionado · variação · tendência · direção
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-2">Indicador</th>
                <th className="py-1 pr-2">Atual</th>
                <th className="py-1 pr-2">Anterior</th>
                <th className="py-1 pr-2">Δ%</th>
                <th className="py-1">Direção</th>
              </tr>
            </thead>
            <tbody>
              {trends.slice(0, 16).map((t) => (
                <tr key={t.metricId} className="border-t">
                  <td className="py-1.5 pr-2 font-medium">{t.metricName}</td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {t.value == null ? "—" : t.value.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {t.previous == null ? "—" : t.previous.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {t.deltaPercent == null ? "—" : `${t.deltaPercent}%`}
                  </td>
                  <td className="py-1.5">{t.direction}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!trends.length ? (
            <p className="text-sm text-muted-foreground">Sem comparativos no período.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card data-dc-block="comparatives">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comparativos</CardTitle>
          <CardDescription>
            Empresa / período — dimensões sem dado ficam “—” (honesto)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-2">Dimensão</th>
                <th className="py-1 pr-2">Receita</th>
                <th className="py-1 pr-2">Lucro</th>
                <th className="py-1 pr-2">Conv.</th>
                <th className="py-1 pr-2">Ticket</th>
                <th className="py-1 pr-2">Pipeline</th>
                <th className="py-1">Caixa</th>
              </tr>
            </thead>
            <tbody>
              {comparatives.map((r) => (
                <tr key={r.label} className="border-t">
                  <td className="py-1.5 pr-2 font-medium">{r.label}</td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {r.receita == null ? "—" : r.receita.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {r.lucro == null ? "—" : r.lucro.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {r.conversao == null ? "—" : r.conversao.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {r.ticket == null ? "—" : r.ticket.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {r.pipeline == null ? "—" : r.pipeline.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1.5 tabular-nums">
                    {r.caixa == null ? "—" : r.caixa.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {comparatives[0]?.evidence}
          </p>
        </CardContent>
      </Card>

      <Card data-dc-block="executive-report">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{report.title}</CardTitle>
          <CardDescription>{report.summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Positivos</p>
            <ul className="mt-1 list-inside list-disc">
              {(report.positives.length ? report.positives : ["—"]).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Críticos</p>
            <ul className="mt-1 list-inside list-disc">
              {(report.criticals.length ? report.criticals : ["—"]).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ações</p>
            <ul className="mt-1 list-inside list-disc">
              {(report.actions.length ? report.actions : ["—"]).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Riscos / Oportunidades</p>
            <ul className="mt-1 list-inside list-disc">
              {[...report.risks, ...report.opportunities].slice(0, 6).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
