"use client";

import { useMemo } from "react";
import type { ChartConfiguration } from "chart.js";

import { Grafico } from "@/components/painel-recorrencia/grafico";
import { brl, brlCompacto } from "@/lib/rede/calculo";

type Cores = { texto: string; grade: string };

const VERDE = "rgba(16,185,129,0.85)";
const VERMELHO = "rgba(239,68,68,0.85)";
const OURO = "#f59e0b";
const AZUL = "rgba(59,130,246,0.85)";

const eixoX = (c: Cores) => ({ grid: { display: false }, border: { display: false }, ticks: { color: c.texto, maxRotation: 0, autoSkip: true } });
const eixoBrl = (c: Cores) => ({ grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto, callback: (v: string | number) => brlCompacto(Number(v)) } });
const legenda = (c: Cores) => ({ labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } });
const dica = { callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${ctx.dataset.label}: ${brl(ctx.parsed.y ?? 0)}` } };

/** Resultado de cada mês da curva de maturação e o acumulado. */
export function CurvaGrafico({ rotulos, resultado, acumulado }: { rotulos: string[]; resultado: number[]; acumulado: number[] }) {
  // Os vetores são recriados a cada digitação no formulário; só remonta o gráfico se os números mudarem de fato.
  const chave = JSON.stringify([rotulos, resultado, acumulado]);
  const config = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: rotulos,
          datasets: [
            { type: "bar", label: "Resultado do mês", data: resultado, backgroundColor: resultado.map((v) => (v >= 0 ? VERDE : VERMELHO)), borderRadius: 8, maxBarThickness: 56 },
            { type: "line", label: "Acumulado", data: acumulado, borderColor: OURO, backgroundColor: OURO, tension: 0.25, pointRadius: 3, borderWidth: 2 },
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dica, legend: legenda(c) }, scales: { y: eixoBrl(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `chave` representa o conteúdo dos três vetores
    [chave],
  );
  return <Grafico config={config} descricao="Resultado mensal e acumulado da loja nova durante a curva de maturação" />;
}

/** Resultado anual (loja madura) e do 1º ano por cenário. */
export function ComparativoCenariosGrafico({ cenarios }: { cenarios: { nome: string; anual: number; primeiroAno: number }[] }) {
  const config = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: cenarios.map((x) => x.nome),
          datasets: [
            { label: "Resultado anual (loja madura)", data: cenarios.map((x) => x.anual), backgroundColor: AZUL, borderRadius: 8, maxBarThickness: 56 },
            { label: "Resultado do 1º ano", data: cenarios.map((x) => x.primeiroAno), backgroundColor: "rgba(245,158,11,0.85)", borderRadius: 8, maxBarThickness: 56 },
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dica, legend: legenda(c) }, scales: { y: eixoBrl(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    [cenarios],
  );
  return <Grafico config={config} descricao="Resultado anual e do primeiro ano de cada cenário" />;
}

/** Impacto mensal das inaugurações no resultado da rede e quantidade de lojas novas abertas. */
export function ImpactoGrafico({ pontos }: { pontos: { mes: string; resultado: number; lojasAbertas: number }[] }) {
  const config = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: pontos.map((p) => `${p.mes.slice(5, 7)}/${p.mes.slice(2, 4)}`),
          datasets: [
            { type: "bar", label: "Resultado das lojas novas", data: pontos.map((p) => p.resultado), backgroundColor: pontos.map((p) => (p.resultado >= 0 ? VERDE : VERMELHO)), borderRadius: 4, yAxisID: "y" },
            { type: "line", label: "Lojas novas abertas", data: pontos.map((p) => p.lojasAbertas), borderColor: OURO, backgroundColor: OURO, stepped: true, pointRadius: 0, borderWidth: 2, yAxisID: "y1" },
          ],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: legenda(c),
            tooltip: { callbacks: { label: (ctx: { dataset: { label?: string; yAxisID?: string }; parsed: { y: number | null } }) => (ctx.dataset.yAxisID === "y1" ? ` ${ctx.dataset.label}: ${ctx.parsed.y ?? 0}` : ` ${ctx.dataset.label}: ${brl(ctx.parsed.y ?? 0)}`) } },
          },
          scales: { y: eixoBrl(c), y1: { position: "right", grid: { display: false }, border: { display: false }, beginAtZero: true, ticks: { color: c.texto, precision: 0 } }, x: eixoX(c) },
        },
      }) as unknown as ChartConfiguration,
    [pontos],
  );
  return <Grafico config={config} altura={260} descricao="Impacto mensal das inaugurações no resultado e quantidade de lojas novas abertas" />;
}
