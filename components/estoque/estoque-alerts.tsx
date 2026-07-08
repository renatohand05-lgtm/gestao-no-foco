import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatQuantity } from "@/lib/estoque/format";
import type { EstoqueProdutoResumo } from "@/types/estoque";

type EstoqueAlertsProps = {
  tenantSlug: string;
  produtos: EstoqueProdutoResumo[];
};

export function EstoqueAlerts({ tenantSlug, produtos }: EstoqueAlertsProps) {
  if (produtos.length === 0) return null;

  return (
    <SectionCard
      title="Alertas de estoque"
      description="Produtos com quantidade abaixo do estoque mínimo."
    >
      <div className="space-y-3">
        {produtos.map((produto) => (
          <div
            key={produto.id}
            className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <Link
                  href={`/${tenantSlug}/produtos/${produto.id}`}
                  className="font-medium hover:underline"
                >
                  {produto.nome}
                </Link>
                <p className="text-sm text-muted-foreground">
                  Atual: {formatQuantity(produto.estoque_atual, produto.unidade_medida)}
                  {" · "}
                  Mínimo: {formatQuantity(produto.estoque_minimo, produto.unidade_medida)}
                </p>
              </div>
            </div>
            <StatusBadge label="Estoque baixo" variant="warning" />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
