"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Coins,
  Hourglass,
  Repeat,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { ChartConfiguration } from "chart.js";

import { ExecutiveHeader, ExecutivePage, ExecutiveSection, MetricCard } from "@/components/executive";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/format";
import type { PainelRecorrencia, PontoMes } from "@/lib/painel-recorrencia/compute";

import { Grafico } from "./grafico";

const MESES_NO_GRAFICO = 18;
const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const COR = {
  azul: "#2563eb",
  verde: "#16a34a",
  vermelho: "#dc2626",
  dourado: "#c9a84c",
  cinza: "#94a3b8",
};

function rotuloMes(mes: string): string {
  return `${NOMES_MES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
}

type Props = {
  painel: PainelRecorrencia;
  nome: string;
  tenantSlug: string;
  /** A empresa também tem o painel antigo, montado a partir da planilha. */
  temVersaoPlanilha: boolean;
};

export function PainelRecorrenciaView({ painel, nome, tenantSlug, temVersaoPlanilha }: Props) {
  const { atual, serie } = painel;
  const recorte = useMemo(() => serie.slice(-MESES_NO_GRAFICO), [serie]);
  const rotulos = useMemo(() => recorte.map((p) => rotuloMes(p.mes) + (p.parcial ? "*" : "")), [recorte]);

  const eixoY = (cores: { texto: string; grade: string }, moeda = true) => ({
    beginAtZero: true,
    ticks: {
      color: cores.texto,
      callback: (v: string | number) => (moeda ? formatCurrencyCompact(Number(v)) : String(v)),
    },
    grid: { color: cores.grade },
  });
  const eixoX = (cores: { texto: string; grade: string }) => ({
    ticks: { color: cores.texto, maxRotation: 0, autoSkip: true },
    grid: { display: false },
  });

  const graficoMrr = useMemo(
    () =>
      (cores: { texto: string; grade: string }): ChartConfiguration => ({
        type: "line",
        data: {
          labels: rotulos,
          datasets: [
            {
              label: "Receita mensal da carteira (MRR)",
              data: recorte.map((p) => p.mrrFim),
              borderColor: COR.azul,
              backgroundColor: "rgba(37, 99, 235, 0.12)",
              fill: true,
              tension: 0.25,
              pointRadius: 2,
              yAxisID: "y",
            },
            {
              label: "Clientes ativos",
              data: recorte.map((p) => p.ativosFim),
              borderColor: COR.dourado,
              borderDash: [5, 4],
              tension: 0.25,
              pointRadius: 2,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { labels: { color: cores.texto } },
            tooltip: {
              callbacks: {
                label: (c) =>
                  c.datasetIndex === 0
                    ? `MRR: ${formatCurrency(Number(c.parsed.y))}`
                    : `Clientes ativos: ${c.parsed.y}`,
              },
            },
          },
          scales: {
            x: eixoX(cores),
            y: eixoY(cores),
            y1: { ...eixoY(cores, false), position: "right", grid: { display: false } },
          },
        },
      }),
    [recorte, rotulos],
  );

  const graficoMovimento = useMemo(
    () =>
      (cores: { texto: string; grade: string }): ChartConfiguration => ({
        type: "bar",
        data: {
          labels: rotulos,
          datasets: [
            { label: "Clientes novos", data: recorte.map((p) => p.novos), backgroundColor: COR.verde },
            { label: "Clientes perdidos (churn)", data: recorte.map((p) => p.churn), backgroundColor: COR.vermelho },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: cores.texto } } },
          scales: { x: eixoX(cores), y: { ...eixoY(cores, false), ticks: { color: cores.texto, precision: 0 } } },
        },
      }),
    [recorte, rotulos],
  );

  const graficoChurn = useMemo(
    () =>
      (cores: { texto: string; grade: string }): ChartConfiguration => ({
        type: "line",
        data: {
          labels: rotulos,
          datasets: [
            {
              label: "Churn do mês (%)",
              data: recorte.map((p) => (p.churnPct == null ? null : Number(p.churnPct.toFixed(1)))),
              borderColor: COR.vermelho,
              backgroundColor: "rgba(220, 38, 38, 0.1)",
              fill: true,
              tension: 0.25,
              pointRadius: 2,
              spanGaps: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: cores.texto } },
            tooltip: { callbacks: { label: (c) => `Churn: ${formatPercent(Number(c.parsed.y))}` } },
          },
          scales: {
            x: eixoX(cores),
            y: { ...eixoY(cores, false), ticks: { color: cores.texto, callback: (v) => `${v}%` } },
          },
        },
      }),
    [recorte, rotulos],
  );

  const graficoResultado = useMemo(
    () =>
      (cores: { texto: string; grade: string }): ChartConfiguration => ({
        type: "bar",
        data: {
          labels: rotulos,
          datasets: [
            { label: "Receitas", data: recorte.map((p) => p.receita), backgroundColor: COR.azul, order: 2 },
            { label: "Despesas", data: recorte.map((p) => p.despesa), backgroundColor: COR.cinza, order: 2 },
            {
              type: "line",
              label: "Resultado",
              data: recorte.map((p) => p.resultado),
              borderColor: COR.verde,
              backgroundColor: COR.verde,
              tension: 0.25,
              pointRadius: 3,
              order: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { labels: { color: cores.texto } },
            tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(Number(c.parsed.y))}` } },
          },
          scales: { x: eixoX(cores), y: { ...eixoY(cores), beginAtZero: false } },
        },
      }),
    [recorte, rotulos],
  );

  const semDados = serie.length === 0 || atual.ativos + recorte.reduce((s, p) => s + p.novos + p.churn, 0) === 0;
  const churnTone =
    atual.churnPctMedia3m == null ? "neutral" : atual.churnPctMedia3m <= 3 ? "success" : atual.churnPctMedia3m <= 6 ? "warning" : "danger";

  return (
    <ExecutivePage width="wide" spacing="loose">
      <ExecutiveHeader
        title="Painel Executivo"
        description={`${nome} · calculado ao vivo com a carteira de clientes e o Financeiro do portal.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" render={<Link href={`/${tenantSlug}/integracoes/importar/planilha`} />}>
              Importar planilha
            </Button>
            {temVersaoPlanilha ? (
              <Button variant="ghost" size="sm" render={<Link href={`/${tenantSlug}/painel-executivo?versao=planilha`} />}>
                Ver versão da planilha
              </Button>
            ) : null}
          </div>
        }
      />

      {painel.avisos.map((a) => (
        <p key={a} className="rounded-lg border border-amber-600/40 px-3 py-2 text-sm" role="note">
          {a}
        </p>
      ))}

      {semDados ? (
        <ExecutiveSection title="Ainda sem dados" panel>
          <p className="text-sm text-muted-foreground">
            Cadastre clientes com data de entrada e valor mensal, ou importe a planilha da empresa, e os indicadores
            aparecem aqui automaticamente.
          </p>
        </ExecutiveSection>
      ) : (
        <>
          <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Receita mensal da carteira (MRR)"
              value={formatCurrency(atual.mrr)}
              hint="Soma do valor mensal dos clientes ativos"
              icon={Repeat}
              tone="primary"
              emphasize
            />
            <MetricCard label="Clientes ativos" value={String(atual.ativos)} hint={`${atual.novosUltimoMes} novo(s) no último mês fechado`} icon={Users} />
            <MetricCard label="Ticket médio" value={atual.ticketMedio == null ? "—" : formatCurrency(atual.ticketMedio)} hint="MRR ÷ clientes ativos" icon={Coins} />
            <MetricCard
              label="Churn (média 3 meses)"
              value={formatPercent(atual.churnPctMedia3m)}
              hint={
                atual.churnPctUltimoMes == null
                  ? "Clientes perdidos ÷ clientes no início do mês"
                  : `Último mês: ${formatPercent(atual.churnPctUltimoMes)}`
              }
              icon={UserMinus}
              tone={churnTone}
            />
            <MetricCard
              label="Resultado do último mês"
              value={atual.resultadoUltimoMes == null ? "—" : formatCurrency(atual.resultadoUltimoMes)}
              hint={
                atual.resultadoUltimoMes == null
                  ? "Sem lançamentos no Financeiro nesse mês"
                  : `Margem ${formatPercent(atual.margemUltimoMes)}${atual.mesFechado ? ` · ${rotuloMes(atual.mesFechado)}` : ""}`
              }
              icon={Wallet}
              tone={atual.resultadoUltimoMes != null && atual.resultadoUltimoMes < 0 ? "danger" : "success"}
            />
            <MetricCard
              label="Valor de um cliente (LTV)"
              value={atual.ltv == null ? "—" : formatCurrency(atual.ltv)}
              hint="Ticket médio ÷ churn mensal"
              icon={TrendingUp}
            />
            <MetricCard
              label="Permanência média"
              value={atual.permanenciaMediaMeses == null ? "—" : `${atual.permanenciaMediaMeses.toFixed(1).replace(".", ",")} meses`}
              hint="De quem já saiu"
              icon={Hourglass}
            />
            <MetricCard
              label="Custo por cliente novo (CAC)"
              value={atual.cacMedio3m == null ? "—" : formatCurrency(atual.cacMedio3m)}
              hint="Despesas comerciais ÷ clientes novos (3 meses)"
              icon={UserPlus}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <ExecutiveSection title="Carteira ao longo do tempo" description="MRR e número de clientes ativos no fim de cada mês." panel>
              <Grafico config={graficoMrr} descricao="Evolução do MRR e dos clientes ativos por mês" />
            </ExecutiveSection>
            <ExecutiveSection title="Entradas e saídas" description="Clientes novos e perdidos em cada mês." panel>
              <Grafico config={graficoMovimento} descricao="Clientes novos e perdidos por mês" />
            </ExecutiveSection>
            {painel.temFinanceiro ? (
              <ExecutiveSection title="Resultado mensal" description="Receitas, despesas e resultado, pela DRE do portal." panel>
                <Grafico config={graficoResultado} descricao="Receitas, despesas e resultado por mês" />
              </ExecutiveSection>
            ) : null}
            <ExecutiveSection title="Churn por mês" description="Percentual de clientes perdidos sobre os clientes do início do mês." panel>
              <Grafico config={graficoChurn} descricao="Percentual de churn por mês" />
            </ExecutiveSection>
          </div>
          <p className="text-xs text-muted-foreground">* mês em andamento.</p>

          {painel.projecao.length > 0 ? (
            <ExecutiveSection
              title="Tendência da carteira"
              description="Linha reta traçada sobre os últimos meses. É só uma indicação do rumo, não uma meta."
              panel
            >
              <div className="flex flex-wrap gap-3">
                {painel.projecao.map((p) => (
                  <div key={p.mes} className="min-w-32 rounded-lg border border-border/60 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{rotuloMes(p.mes)}</p>
                    <p className="text-lg font-semibold tabular-nums">{formatCurrency(p.mrr)}</p>
                  </div>
                ))}
              </div>
            </ExecutiveSection>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <ExecutiveSection title="Por nicho" description="Clientes ativos, receita mensal e churn de cada segmento." panel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nicho</TableHead>
                    <TableHead className="text-right">Ativos</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">Churn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {painel.nichos.slice(0, 12).map((n) => (
                    <TableRow key={n.nicho}>
                      <TableCell className="font-medium">{n.nicho}</TableCell>
                      <TableCell className="text-right tabular-nums">{n.ativos}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(n.mrr)}</TableCell>
                      <TableCell className="text-right tabular-nums">{n.churn}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ExecutiveSection>

            <ExecutiveSection title="Por que os clientes saem" description="Motivos informados no cadastro dos clientes perdidos." panel>
              {painel.motivos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente perdido ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Clientes</TableHead>
                      <TableHead className="text-right">MRR perdido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {painel.motivos.slice(0, 10).map((m) => (
                      <TableRow key={m.motivo}>
                        <TableCell className="font-medium">{m.motivo}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.clientes}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(m.mrr)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ExecutiveSection>
          </div>

          <ExecutiveSection
            title="Maiores clientes"
            description={
              atual.concentracaoTop5Pct == null
                ? "Clientes com maior valor mensal."
                : `Os 5 maiores respondem por ${formatPercent(atual.concentracaoTop5Pct, 0)} da receita mensal da carteira.`
            }
            panel
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead className="text-right">Valor mensal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {painel.top.map((c) => (
                  <TableRow key={`${c.nome}-${c.entrada}`}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{c.nicho ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(c.mrr)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ExecutiveSection>

          <TabelaMeses serie={recorte} temFinanceiro={painel.temFinanceiro} />
        </>
      )}
    </ExecutivePage>
  );
}

function TabelaMeses({ serie, temFinanceiro }: { serie: PontoMes[]; temFinanceiro: boolean }) {
  const linhas = [...serie].reverse();
  return (
    <ExecutiveSection title="Mês a mês" description="Os números de cada mês, do mais recente para o mais antigo." panel>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mês</TableHead>
            <TableHead className="text-right">Ativos</TableHead>
            <TableHead className="text-right">Novos</TableHead>
            <TableHead className="text-right">Perdidos</TableHead>
            <TableHead className="text-right">Churn</TableHead>
            <TableHead className="text-right">MRR</TableHead>
            {temFinanceiro ? (
              <>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((p) => (
            <TableRow key={p.mes}>
              <TableCell className="font-medium">
                {rotuloMes(p.mes)}
                {p.parcial ? <span className="ml-1 text-xs text-muted-foreground">(em andamento)</span> : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{p.ativosFim}</TableCell>
              <TableCell className="text-right tabular-nums">{p.novos}</TableCell>
              <TableCell className="text-right tabular-nums">{p.churn}</TableCell>
              <TableCell className="text-right tabular-nums">{p.churnPct == null ? "—" : formatPercent(p.churnPct)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(p.mrrFim)}</TableCell>
              {temFinanceiro ? (
                <>
                  <TableCell className="text-right tabular-nums">{p.receita == null ? "—" : formatCurrency(p.receita)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.despesa == null ? "—" : formatCurrency(p.despesa)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.resultado == null ? "—" : formatCurrency(p.resultado)}</TableCell>
                </>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ExecutiveSection>
  );
}
