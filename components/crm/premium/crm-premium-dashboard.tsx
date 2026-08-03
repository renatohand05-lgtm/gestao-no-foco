import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CrmPremiumDashboard } from "@/lib/crm/premium/types";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  data: CrmPremiumDashboard;
};

function MomBadge({
  deltaPct,
}: {
  deltaPct: number | null;
}) {
  if (deltaPct == null) {
    return (
      <span className="text-[11px] text-muted-foreground">Sem base no período</span>
    );
  }
  const positive = deltaPct >= 0;
  return (
    <span
      className={cn(
        "text-[11px] tabular-nums",
        positive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
      )}
    >
      {positive ? "+" : ""}
      {deltaPct}% vs mês ant.
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  mom,
}: {
  label: string;
  value: string;
  hint?: string;
  mom?: number | null;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs transition-colors hover:border-primary/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      {mom !== undefined ? <div className="mt-1"><MomBadge deltaPct={mom} /></div> : null}
    </div>
  );
}

const RISK_LABEL: Record<string, string> = {
  sem_contato: "Sem contato",
  negocio_parado: "Negócio parado",
  followup_vencido: "Follow-up vencido",
  oportunidade_fria: "Oportunidade fria",
  sem_atividade: "Sem atividade",
};

export function CrmPremiumDashboardView({ tenantSlug, data }: Props) {
  const { kpis, forecast, lossReasons, atRisk, owners, empty } = data;

  return (
    <div className="space-y-6" data-crm-premium="dashboard">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">CRM Premium</h2>
          <p className="text-sm text-muted-foreground">
            Pipeline, previsão e riscos com dados reais — sem métricas inventadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/${tenantSlug}/clientes/funil`}
            className="inline-flex h-9 items-center rounded-md border px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Pipeline
          </Link>
          <Link
            href={`/${tenantSlug}/crm/follow-ups`}
            className="inline-flex h-9 items-center rounded-md border px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Follow-ups
          </Link>
          <Link
            href={`/${tenantSlug}/crm/oportunidades`}
            className="inline-flex h-9 items-center rounded-md border px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Oportunidades
          </Link>
        </div>
      </div>

      {empty ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum dado comercial ainda. Cadastre clientes e oportunidades para
            preencher o cockpit.
          </CardContent>
        </Card>
      ) : null}

      <section
        aria-label="Indicadores Premium do CRM"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
      >
        <Kpi
          label="Oportunidades"
          value={String(kpis.totalOportunidades)}
          mom={kpis.mom.totalOportunidades.deltaPct}
        />
        <Kpi
          label="Valor do pipeline"
          value={formatCurrency(kpis.valorPipeline)}
          mom={kpis.mom.valorPipeline.deltaPct}
        />
        <Kpi
          label="Receita prevista"
          value={formatCurrency(kpis.receitaPrevista)}
          hint="Soma abertas"
        />
        <Kpi
          label="Receita provável"
          value={formatCurrency(kpis.receitaProvavel)}
          hint="Valor × probabilidade"
        />
        <Kpi
          label="Receita fechada (mês)"
          value={formatCurrency(kpis.receitaFechada)}
          mom={kpis.mom.receitaFechada.deltaPct}
        />
        <Kpi label="Taxa de conversão" value={`${kpis.taxaConversao}%`} />
        <Kpi label="Ticket médio" value={formatCurrency(kpis.ticketMedio)} />
        <Kpi
          label="Tempo médio fechamento"
          value={
            kpis.tempoMedioFechamentoDias != null
              ? `${kpis.tempoMedioFechamentoDias} d`
              : "—"
          }
        />
        <Kpi label="Follow-ups pendentes" value={String(kpis.followUpsPendentes)} />
        <Kpi label="Oportunidades paradas" value={String(kpis.oportunidadesParadas)} />
        <Kpi label="Clientes sem contato" value={String(kpis.clientesSemContato)} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-crm-premium="forecast">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previsão de receita</CardTitle>
            <CardDescription>
              Funil ponderado · conversão {forecast.conversao}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Prevista</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(forecast.receitaPrevista)}
                </p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Provável</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(forecast.receitaProvavel)}
                </p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Fechada</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(forecast.receitaFechada)}
                </p>
              </div>
            </div>
            {forecast.funil.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem oportunidades abertas.</p>
            ) : (
              <ul className="space-y-1.5">
                {forecast.funil.map((f) => (
                  <li
                    key={f.stage}
                    className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
                  >
                    <span className="font-medium capitalize">{f.stage}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {f.count} · {formatCurrency(f.valor)} · pond.{" "}
                      {formatCurrency(f.ponderado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card data-crm-premium="loss-reasons">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Motivos de perda</CardTitle>
            <CardDescription>Categorias determinísticas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lossReasons.every((b) => b.total === 0) ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma perda categorizada neste período.
              </p>
            ) : (
              lossReasons.map((b) => (
                <div key={b.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{b.category}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {b.total} · {b.share}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={b.share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${b.category}: ${b.share}%`}
                  >
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${Math.min(100, b.share)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-crm-premium="at-risk">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Clientes em risco</CardTitle>
            <CardDescription>Prioridade por sinais reais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum risco detectado.</p>
            ) : (
              atRisk.slice(0, 12).map((c) => (
                <Link
                  key={c.clienteId}
                  href={`/${tenantSlug}/clientes/${c.clienteId}`}
                  className="block rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.nome}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] uppercase",
                        c.priority === "alta" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
                        c.priority === "media" && "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
                        c.priority === "baixa" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {c.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.kinds.map((k) => RISK_LABEL[k] ?? k).join(" · ")}
                    {" · score "}
                    {c.score}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card data-crm-premium="owners">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Responsáveis</CardTitle>
            <CardDescription>Ranking por receita e pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {owners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem responsáveis atribuídos nas oportunidades.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-2">#</th>
                      <th className="py-1 pr-2">Nome</th>
                      <th className="py-1 pr-2 tabular-nums">Pipeline</th>
                      <th className="py-1 pr-2 tabular-nums">Conv.</th>
                      <th className="py-1 pr-2 tabular-nums">Receita</th>
                      <th className="py-1 tabular-nums">FU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.slice(0, 10).map((o) => (
                      <tr key={o.responsavelId ?? o.nome} className="border-t">
                        <td className="py-1.5 pr-2 tabular-nums">{o.rank}</td>
                        <td className="py-1.5 pr-2 font-medium">{o.nome}</td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {formatCurrency(o.pipeline)}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">{o.conversao}%</td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {formatCurrency(o.receita)}
                        </td>
                        <td className="py-1.5 tabular-nums">{o.followUps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
