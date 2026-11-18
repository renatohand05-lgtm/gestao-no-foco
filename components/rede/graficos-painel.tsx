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
const ROXO = "rgba(168,85,247,0.85)";
const OURO = "#f59e0b";
const CINZA = "rgba(148,163,184,0.45)";

const eixoY = (c: Cores) => ({
  grid: { color: c.grade },
  border: { display: false },
  ticks: { color: c.texto, callback: (v: string | number) => brlCompacto(Number(v)) },
});
const eixoX = (c: Cores) => ({ grid: { display: false }, border: { display: false }, ticks: { color: c.texto, maxRotation: 0, autoSkip: true } });
const legenda = (c: Cores) => ({ labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } });
const dica = { callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${ctx.dataset.label}: ${brl(ctx.parsed.y ?? 0)}` } };

export type DadosGraficos = {
  lojas: { nome: string; fat: number; metaMes: number | null; piso: number }[];
  rotuloMesRef: string;
  serie: { data: string; salao: number; delivery: number; metaDia: number; acumReal: number | null; acumMeta: number }[];
  canais: { salao: number; delivery: number };
  horas: { hora: number; salao: number; delivery: number }[];
  picoHora: number | null;
  temMetaSerie: boolean;
};

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function GraficosPainel({ dados }: { dados: DadosGraficos }) {
  const porLoja = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: dados.lojas.map((l) => l.nome),
          datasets: [
            { type: "line", label: "Piso", data: dados.lojas.map((l) => l.piso), borderColor: OURO, borderDash: [6, 5], borderWidth: 2, pointRadius: 0 },
            { type: "bar", label: "Faturamento", data: dados.lojas.map((l) => l.fat), backgroundColor: dados.lojas.map((l) => (l.fat >= l.piso ? VERDE : VERMELHO)), borderRadius: 8, maxBarThickness: 64 },
            { type: "bar", label: "Meta do mês", data: dados.lojas.map((l) => l.metaMes), backgroundColor: CINZA, borderRadius: 8, maxBarThickness: 64 },
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dica, legend: legenda(c) }, scales: { y: eixoY(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    [dados.lojas],
  );

  const porDia = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: dados.serie.map((p) => ddmm(p.data)),
          datasets: [
            ...(dados.temMetaSerie ? [{ type: "line", label: "Meta do dia", data: dados.serie.map((p) => p.metaDia), borderColor: OURO, borderWidth: 2, pointRadius: 0, tension: 0.25 }] : []),
            { type: "bar", label: "Salão", data: dados.serie.map((p) => p.salao), backgroundColor: AZUL, stack: "v" },
            { type: "bar", label: "Delivery", data: dados.serie.map((p) => p.delivery), backgroundColor: ROXO, stack: "v" },
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dica, legend: legenda(c) }, scales: { y: { ...eixoY(c), stacked: true }, x: { ...eixoX(c), stacked: true } } },
      }) as unknown as ChartConfiguration,
    [dados.serie, dados.temMetaSerie],
  );

  const acumulado = useMemo(
    () => (c: Cores) =>
      ({
        type: "line",
        data: {
          labels: dados.serie.map((p) => ddmm(p.data)),
          datasets: [
            { label: "Realizado acumulado", data: dados.serie.map((p) => p.acumReal), borderColor: VERDE, backgroundColor: "rgba(16,185,129,0.12)", fill: true, borderWidth: 2.5, pointRadius: 0, tension: 0.2, spanGaps: false },
            ...(dados.temMetaSerie ? [{ label: "Meta acumulada", data: dados.serie.map((p) => p.acumMeta), borderColor: OURO, borderDash: [6, 5], borderWidth: 2, pointRadius: 0, tension: 0.2 }] : []),
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dica, legend: legenda(c) }, scales: { y: eixoY(c), x: eixoX(c) } },
      }) as unknown as ChartConfiguration,
    [dados.serie, dados.temMetaSerie],
  );

  const canais = useMemo(
    () => (c: Cores) =>
      ({
        type: "doughnut",
        data: { labels: ["Salão", "Delivery"], datasets: [{ data: [dados.canais.salao, dados.canais.delivery], backgroundColor: [AZUL, ROXO], borderWidth: 0 }] },
        options: {
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: { legend: { position: "bottom", ...legenda(c) }, tooltip: { callbacks: { label: (ctx: { label: string; parsed: number }) => ` ${ctx.label}: ${brl(ctx.parsed)}` } } },
        },
      }) as unknown as ChartConfiguration,
    [dados.canais],
  );

  const porHora = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: dados.horas.map((h) => `${String(h.hora).padStart(2, "0")}h`),
          datasets: [
            { label: "Salão", data: dados.horas.map((h) => h.salao), backgroundColor: AZUL, stack: "h", borderRadius: 4 },
            { label: "Delivery", data: dados.horas.map((h) => h.delivery), backgroundColor: ROXO, stack: "h", borderRadius: 4 },
          ],
        },
        options: { maintainAspectRatio: false, plugins: { tooltip: dica, legend: legenda(c) }, scales: { y: { ...eixoY(c), stacked: true }, x: { ...eixoX(c), stacked: true } } },
      }) as unknown as ChartConfiguration,
    [dados.horas],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title={`Faturamento por loja — ${dados.rotuloMesRef}`} description="Barras verdes passaram do piso; vermelhas ainda não. Em mês aberto, o piso é proporcional aos dias já fechados." className="lg:col-span-2">
        <Grafico config={porLoja} altura={280} descricao="Faturamento de cada loja comparado ao piso e à meta do mês" />
      </SectionCard>
      <SectionCard title="Vendas por dia" description="Salão e delivery empilhados; linha dourada = meta do dia (peso por dia da semana).">
        <Grafico config={porDia} altura={260} descricao="Vendas diárias da rede, por canal, com a meta diária" />
      </SectionCard>
      <SectionCard title="Realizado × meta acumulados" description="Se a linha verde está acima da dourada, a rede está à frente da meta.">
        <Grafico config={acumulado} altura={260} descricao="Faturamento acumulado no período comparado à meta acumulada" />
      </SectionCard>
      <SectionCard title="Salão × delivery" description="Participação de cada canal no faturamento do período.">
        <Grafico config={canais} altura={240} descricao="Divisão do faturamento entre salão e delivery" />
      </SectionCard>
      <SectionCard
        title="Vendas por hora"
        description={dados.horas.length === 0 ? "Sem fechamento por hora lançado para o período." : `Média por dia com venda${dados.picoHora != null ? ` · pico às ${String(dados.picoHora).padStart(2, "0")}h` : ""}.`}
      >
        {dados.horas.length === 0 ? <p className="text-sm text-muted-foreground">Quando o fechamento mensal por hora for lançado, o gráfico aparece aqui.</p> : <Grafico config={porHora} altura={240} descricao="Média de vendas por hora do dia, por canal" />}
      </SectionCard>
    </div>
  );
}
