"use client";

import { useEffect, useRef } from "react";
import type { ChartConfiguration } from "chart.js";

type Props = {
  /** Monta a configuração do gráfico com as cores do tema atual. */
  config: (cores: { texto: string; grade: string }) => ChartConfiguration;
  altura?: number;
  descricao: string;
};

/** Gráfico do Chart.js carregado sob demanda (fora do pacote inicial da página). */
export function Grafico({ config, altura = 240, descricao }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelado = false;
    let destruir: (() => void) | undefined;

    void (async () => {
      const { default: Chart } = await import("chart.js/auto");
      if (cancelado || !canvas.current) return;
      const estilo = getComputedStyle(document.body);
      const texto = estilo.color || "#64748b";
      const grade = "rgba(148, 163, 184, 0.25)";
      const cfg = config({ texto, grade });
      const chart = new Chart(canvas.current, cfg);
      destruir = () => chart.destroy();
    })();

    return () => {
      cancelado = true;
      destruir?.();
    };
  }, [config]);

  return (
    <div style={{ height: altura }} className="relative w-full">
      <canvas ref={canvas} role="img" aria-label={descricao} />
    </div>
  );
}
