"use client";

import { useMemo } from "react";
import type { ChartConfiguration } from "chart.js";

import { Grafico } from "@/components/painel-recorrencia/grafico";
import { SectionCard } from "@/components/ui/section-card";
import { brl, brlCompacto } from "@/lib/rede/calculo";

type Cores = { texto: string; grade: string };

const VERDE = "rgba(16,185,129,0.85)";
const VERMELHO = "rgba(239,68,68,0.85)";
const AZUL = "rgba(59,130,246,0.85)";
const OURO = "#f59e0b";
const PALETA = ["#ef4444", "#f59e0b", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#94a3b8", "#10b981"];

const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const eixoX = (c: Cores) => ({ grid: { display: false }, border: { display: false }, ticks: { color: c.texto, maxRotation: 0, autoSkip: true } });
const eixoBrl = (c: Cores) => ({ grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto, callback: (v: string | number) => brlCompacto(Number(v)) } });
const legenda = (c: Cores) => ({ labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } });
const mesRotulo = (m: string) => `${m.slice(5, 7)}/${m.slice(2, 4)}`;

export type DadosDreGraficos = {
  lojas: { nome: string; resultado: number; margem: number; orcado: number | null }[];
  evolucao: { mes: string; resultado: number; margem: number }[];
  distribuicao: { nome: string; valor: number }[];
  rotuloMes: string;
};

export function DreGraficos({ dados }: { dados: DadosDreGraficos }) {
  const porLoja = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: dados.lojas.map((l) => l.nome),
          datasets: [
            { type: "bar", label: "Resultado realizado", data: dados.lojas.map((l) => l.resultado), backgroundColor: dados.lojas.map((l) => (l.resultado >= 0 ? VERDE : VERMELHO)), borderRadius: 8, maxBarThickness: 64 },
            ...(dados.lojas.some((l) => l.orcado != null) ? [{ type: "bar", label: "Resultado orçado", data: dados.lojas.map((l) => l.orcado), backgroundColor: "rgba(148,163,184,0.45)", borderRadius: 8, maxBarThickness: 64 }] : []),
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${ctx.dataset.label}: ${brl(ctx.parsed.y ?? 0)}` } }, legend: legenda(c) }, scales: { y: eixoBrl(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    [dados.lojas],
  );

  const margem = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: dados.lojas.map((l) => l.nome),
          datasets: [{ label: "Margem operacional", data: dados.lojas.map((l) => l.margem), backgroundColor: dados.lojas.map((l) => (l.margem >= 0 ? AZUL : VERMELHO)), borderRadius: 8, maxBarThickness: 64 }],
        },
        options: {
          maintainAspectRatio: false,
          plugins: { tooltip: { callbacks: { label: (ctx: { parsed: { y: number | null } }) => ` Margem: ${nf1.format(ctx.parsed.y ?? 0)}%` } }, legend: { display: false } },
          scales: { y: { grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto, callback: (v: string | number) => `${nf1.format(Number(v))}%` } }, x: eixoX(c) },
        },
      }) as unknown as ChartConfiguration,
    [dados.lojas],
  );

  const evolucao = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: dados.evolucao.map((e) => mesRotulo(e.mes)),
          datasets: [
            { type: "bar", label: "Resultado da rede", data: dados.evolucao.map((e) => e.resultado), backgroundColor: dados.evolucao.map((e) => (e.resultado >= 0 ? VERDE : VERMELHO)), borderRadius: 8, maxBarThickness: 56, yAxisID: "y" },
            { type: "line", label: "Margem (%)", data: dados.evolucao.map((e) => e.margem), borderColor: OURO, backgroundColor: OURO, tension: 0.3, pointRadius: 3, borderWidth: 2, yAxisID: "y1" },
          ],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: legenda(c),
            tooltip: { callbacks: { label: (ctx: { dataset: { label?: string; yAxisID?: string }; parsed: { y: number | null } }) => (ctx.dataset.yAxisID === "y1" ? ` ${ctx.dataset.label}: ${nf1.format(ctx.parsed.y ?? 0)}%` : ` ${ctx.dataset.label}: ${brl(ctx.parsed.y ?? 0)}`) } },
          },
          scales: {
            y: eixoBrl(c),
            y1: { position: "right", grid: { display: false }, border: { display: false }, ticks: { color: c.texto, callback: (v: string | number) => `${nf1.format(Number(v))}%` } },
            x: eixoX(c),
          },
        },
      }) as unknown as ChartConfiguration,
    [dados.evolucao],
  );

  const distribuicao = useMemo(
    () => (c: Cores) =>
      ({
        type: "doughnut",
        data: { labels: dados.distribuicao.map((d) => d.nome), datasets: [{ data: dados.distribuicao.map((d) => Math.round(d.valor * 10) / 10), backgroundColor: dados.distribuicao.map((_, i) => PALETA[i % PALETA.length]), borderWidth: 0 }] },
        options: {
          maintainAspectRatio: false,
          cutout: "58%",
          plugins: { legend: { position: "right", labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (ctx: { label: string; parsed: number }) => ` ${ctx.label}: R$ ${nf1.format(ctx.parsed)}` } } },
        },
      }) as unknown as ChartConfiguration,
    [dados.distribuicao],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard title={`Resultado por loja — ${dados.rotuloMes}`} description="Resultado operacional do realizado (com estimativas onde ainda não há lançamento) contra o orçado pela meta de faturamento.">
        {dados.lojas.length > 0 ? <Grafico config={porLoja} descricao="Resultado operacional realizado e orçado por loja" /> : <p className="text-sm text-muted-foreground">Nenhuma loja com vendas no mês.</p>}
      </SectionCard>
      <SectionCard title={`Margem por loja — ${dados.rotuloMes}`} description="Resultado operacional ÷ faturamento bruto.">
        {dados.lojas.length > 0 ? <Grafico config={margem} descricao="Margem operacional por loja" /> : <p className="text-sm text-muted-foreground">Nenhuma loja com vendas no mês.</p>}
      </SectionCard>
      <SectionCard title="Evolução da rede" description="Resultado e margem dos últimos meses com vendas.">
        {dados.evolucao.length > 0 ? <Grafico config={evolucao} descricao="Resultado e margem da rede nos últimos meses" /> : <p className="text-sm text-muted-foreground">Sem meses com vendas.</p>}
      </SectionCard>
      <SectionCard title="Para cada R$ 100 vendidos" description="Quanto vai para cada grupo de custo e quanto sobra de resultado (rede, mês em foco).">
        {dados.distribuicao.length > 0 ? <Grafico config={distribuicao} altura={260} descricao="Distribuição de cada R$ 100 de faturamento da rede" /> : <p className="text-sm text-muted-foreground">Sem faturamento no mês.</p>}
      </SectionCard>
    </div>
  );
}
