"use client";

import { useMemo } from "react";
import type { ChartConfiguration } from "chart.js";

import { Grafico } from "@/components/painel-recorrencia/grafico";
import { SectionCard } from "@/components/ui/section-card";

type Cores = { texto: string; grade: string };

const PALETA = ["#3b82f6", "#a855f7", "#10b981", "#f97316", "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#84cc16", "#06b6d4"];
const OURO = "#f59e0b";
const VERMELHO = "rgba(239,68,68,0.85)";

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const eixoX = (c: Cores) => ({ grid: { display: false }, border: { display: false }, ticks: { color: c.texto, maxRotation: 0, autoSkip: true } });
const eixoInteiros = (c: Cores) => ({ grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto, precision: 0 } });
const legenda = (c: Cores) => ({ labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } });

export type DadosCozinhaGraficos = {
  /** Segundas-feiras das semanas mostradas. */
  semanas: string[];
  lojas: { nome: string; contagens: number[] }[];
  /** Meta semanal por loja (linha tracejada). */
  meta: number;
  itens: { item: string; total: number }[];
  motivos: { motivo: string; total: number }[];
};

export function CozinhaGraficos({ dados }: { dados: DadosCozinhaGraficos }) {
  const rotulos = useMemo(() => dados.semanas.map((s) => `Sem. ${ddmm(s)}`), [dados.semanas]);

  const porSemana = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: rotulos,
          datasets: [
            ...dados.lojas.map((l, i) => ({ type: "bar" as const, label: l.nome, data: l.contagens, backgroundColor: PALETA[i % PALETA.length], borderRadius: 6, maxBarThickness: 34 })),
            { type: "line" as const, label: "Meta por loja", data: rotulos.map(() => dados.meta), borderColor: OURO, borderDash: [6, 5], pointRadius: 0, borderWidth: 2 },
          ],
        },
        options: { maintainAspectRatio: false, plugins: { legend: legenda(c) }, scales: { y: eixoInteiros(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    [dados.lojas, dados.meta, rotulos],
  );

  const topItens = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: { labels: dados.itens.map((i) => i.item), datasets: [{ label: "Rupturas", data: dados.itens.map((i) => i.total), backgroundColor: VERMELHO, borderRadius: 6 }] },
        options: {
          indexAxis: "y",
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: eixoInteiros(c), y: { grid: { display: false }, border: { display: false }, ticks: { color: c.texto } } },
        },
      }) as unknown as ChartConfiguration,
    [dados.itens],
  );

  const motivos = useMemo(
    () => (c: Cores) =>
      ({
        type: "doughnut",
        data: { labels: dados.motivos.map((m) => m.motivo), datasets: [{ data: dados.motivos.map((m) => m.total), backgroundColor: PALETA, borderWidth: 0 }] },
        options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "right", labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } } } },
      }) as unknown as ChartConfiguration,
    [dados.motivos],
  );

  return (
    <div className="space-y-4">
      <SectionCard title="Rupturas por semana e loja" description={`Meta: até ${dados.meta} por loja na semana.`}>
        <Grafico config={porSemana} altura={280} descricao={`Rupturas por semana e loja, nas últimas ${dados.semanas.length} semanas, com a meta de ${dados.meta} por loja.`} />
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Itens que mais faltam">
          <Grafico config={topItens} altura={300} descricao="Itens com mais rupturas nas semanas mostradas." />
        </SectionCard>
        <SectionCard title="Motivos das rupturas">
          <Grafico config={motivos} altura={300} descricao="Rupturas por motivo nas semanas mostradas." />
        </SectionCard>
      </div>
    </div>
  );
}
