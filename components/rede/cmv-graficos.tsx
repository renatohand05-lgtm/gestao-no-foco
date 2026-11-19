"use client";

import { useMemo } from "react";
import type { ChartConfiguration } from "chart.js";

import { Grafico } from "@/components/painel-recorrencia/grafico";
import { SectionCard } from "@/components/ui/section-card";

type Cores = { texto: string; grade: string };

const PALETA = ["#3b82f6", "#a855f7", "#10b981", "#f97316", "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#84cc16", "#06b6d4"];
const VERDE = "rgba(16,185,129,0.85)";
const AMARELO = "rgba(245,158,11,0.85)";
const VERMELHO = "rgba(239,68,68,0.85)";
const OURO = "#f59e0b";

const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const eixoX = (c: Cores) => ({ grid: { display: false }, border: { display: false }, ticks: { color: c.texto, maxRotation: 0, autoSkip: true } });
const legenda = (c: Cores) => ({ labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } });
const eixoPct = (c: Cores) => ({ grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto, callback: (v: string | number) => `${nf1.format(Number(v))}%` } });
const dicaPct = { callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${ctx.dataset.label}: ${ctx.parsed.y == null ? "—" : `${nf1.format(ctx.parsed.y)}%`}` } };

export type DadosCmvGraficos = {
  semanas: string[];
  /** CMV real % por loja e semana (null = sem contagem). */
  lojas: { nome: string; real: (number | null)[] }[];
  /** CMV real e teórico da rede por semana. */
  rede: { real: (number | null)[]; teorico: (number | null)[] };
  /** Meta de CMV da rede (linha de referência), se houver. */
  meta: number | null;
  /** Dispersão por loja na semana em foco. */
  dispersao: { nome: string; valor: number }[];
  tolerancia: number;
};

export function CmvGraficos({ dados }: { dados: DadosCmvGraficos }) {
  const rotulos = useMemo(() => dados.semanas.map(ddmm), [dados.semanas]);

  const porLoja = useMemo(
    () => (c: Cores) =>
      ({
        type: "line",
        data: {
          labels: rotulos,
          datasets: [
            ...dados.lojas.map((l, i) => ({ label: l.nome, data: l.real, borderColor: PALETA[i % PALETA.length], backgroundColor: PALETA[i % PALETA.length], tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true })),
            ...(dados.meta != null ? [{ label: `Meta ${nf1.format(dados.meta)}%`, data: rotulos.map(() => dados.meta), borderColor: OURO, borderDash: [6, 5], pointRadius: 0, borderWidth: 2 }] : []),
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dicaPct, legend: legenda(c) }, scales: { y: eixoPct(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    [dados.lojas, dados.meta, rotulos],
  );

  const realTeorico = useMemo(
    () => (c: Cores) =>
      ({
        type: "line",
        data: {
          labels: rotulos,
          datasets: [
            { label: "CMV real da rede", data: dados.rede.real, borderColor: "#ef4444", backgroundColor: "#ef4444", tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true },
            { label: "CMV teórico da rede", data: dados.rede.teorico, borderColor: "#3b82f6", backgroundColor: "#3b82f6", borderDash: [4, 4], tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true },
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dicaPct, legend: legenda(c) }, scales: { y: eixoPct(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    [dados.rede, rotulos],
  );

  const dispersao = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: dados.dispersao.map((d) => d.nome),
          datasets: [
            {
              type: "bar",
              label: "Dispersão",
              data: dados.dispersao.map((d) => d.valor),
              backgroundColor: dados.dispersao.map((d) => (d.valor <= dados.tolerancia ? VERDE : d.valor <= dados.tolerancia * 2 ? AMARELO : VERMELHO)),
              borderRadius: 10,
              maxBarThickness: 70,
            },
            { type: "line", label: "Tolerância", data: dados.dispersao.map(() => dados.tolerancia), borderColor: OURO, borderDash: [6, 5], pointRadius: 0, borderWidth: 2 },
          ],
        },
        options: {
          maintainAspectRatio: false,
          plugins: { tooltip: { callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${ctx.dataset.label}: ${nf1.format(ctx.parsed.y ?? 0)} p.p.` } }, legend: legenda(c) },
          scales: { y: { grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto, callback: (v: string | number) => `${nf1.format(Number(v))} p.p.` } }, x: eixoX(c) },
        },
      }) as unknown as ChartConfiguration,
    [dados.dispersao, dados.tolerancia],
  );

  const temSerie = dados.lojas.some((l) => l.real.some((v) => v != null));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard title="CMV real por loja, semana a semana" description="Cada linha é uma loja; a linha pontilhada é a meta de CMV da rede.">
        {temSerie ? <Grafico config={porLoja} descricao="CMV real por loja nas últimas semanas, com a meta" /> : <p className="text-sm text-muted-foreground">Nenhuma contagem nestas semanas.</p>}
      </SectionCard>
      <SectionCard title="CMV real × teórico da rede" description="Real = estoque inicial + compras ± transferências − devoluções − estoque final, sobre as vendas. Teórico = fichas técnicas.">
        {temSerie ? <Grafico config={realTeorico} descricao="CMV real e teórico da rede por semana" /> : <p className="text-sm text-muted-foreground">Nenhuma contagem nestas semanas.</p>}
      </SectionCard>
      <SectionCard title="Dispersão por loja na semana" description="Real − teórico, em pontos percentuais. Verde até a tolerância; amarelo até o dobro; vermelho acima.">
        {dados.dispersao.length > 0 ? <Grafico config={dispersao} descricao="Dispersão do CMV por loja na semana, com a tolerância" /> : <p className="text-sm text-muted-foreground">Nenhuma contagem com vendas na semana.</p>}
      </SectionCard>
    </div>
  );
}
