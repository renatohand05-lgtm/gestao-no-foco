import { StatusBadge } from "@/components/ui/status-badge";
import { getTipoLabel } from "@/lib/produtos/format";
import type { ProdutoTipo } from "@/types/produtos";

type ProdutoTipoBadgeProps = {
  tipo: ProdutoTipo;
};

const tipoVariantMap: Record<
  ProdutoTipo,
  React.ComponentProps<typeof StatusBadge>["variant"]
> = {
  produto: "default",
  servico: "outline",
  kit: "warning",
  combo: "success",
  materia_prima: "secondary",
};

export function ProdutoTipoBadge({ tipo }: ProdutoTipoBadgeProps) {
  return (
    <StatusBadge
      label={getTipoLabel(tipo)}
      variant={tipoVariantMap[tipo]}
    />
  );
}
