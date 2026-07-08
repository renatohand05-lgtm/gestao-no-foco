import { StatusBadge } from "@/components/ui/status-badge";
import { getMovimentacaoTipoLabel } from "@/lib/estoque/format";
import type { MovimentacaoTipo } from "@/types/estoque";

type EstoqueTipoBadgeProps = {
  tipo: MovimentacaoTipo;
};

const tipoVariantMap: Record<
  MovimentacaoTipo,
  React.ComponentProps<typeof StatusBadge>["variant"]
> = {
  entrada: "success",
  saida: "danger",
  ajuste: "warning",
};

export function EstoqueTipoBadge({ tipo }: EstoqueTipoBadgeProps) {
  return (
    <StatusBadge
      label={getMovimentacaoTipoLabel(tipo)}
      variant={tipoVariantMap[tipo]}
    />
  );
}
