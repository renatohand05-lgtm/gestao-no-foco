import { CommercialRankingPanel } from "@/components/vendas/commercial-ranking-panel";
import type { CiRankingRow } from "@/lib/vendas/commercial-intelligence-types";

type Props = {
  rows: CiRankingRow[];
  coberturaSemOrigemPct?: number | null;
  aviso?: string | null;
};

/** Origens reais de canal_venda — Sem origem explícito; sem categorias inventadas. */
export function CommercialOriginPanel({
  rows,
  coberturaSemOrigemPct,
  aviso,
}: Props) {
  return (
    <div className="space-y-2">
      <CommercialRankingPanel
        title="Vendas por origem"
        description="OS, Venda rápida e canais reais. Sem origem = histórico sem canal."
        rows={rows}
        emptyLabel="Sem origens no período."
      />
      {coberturaSemOrigemPct != null ? (
        <p className="text-xs text-muted-foreground">
          Sem origem: {coberturaSemOrigemPct.toLocaleString("pt-BR")}% das
          faturadas do período.
        </p>
      ) : null}
      {aviso ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">{aviso}</p>
      ) : null}
    </div>
  );
}
