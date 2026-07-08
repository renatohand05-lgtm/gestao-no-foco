import { StatusBadge } from "@/components/ui/status-badge";
import { getStatusLabel } from "@/lib/vendas/format";
import type { VendaStatus } from "@/types/vendas";

type VendaStatusBadgeProps = {
  status: VendaStatus;
};

const variantMap: Record<
  VendaStatus,
  React.ComponentProps<typeof StatusBadge>["variant"]
> = {
  orcamento: "secondary",
  em_andamento: "warning",
  faturado: "success",
  cancelado: "danger",
};

export function VendaStatusBadge({ status }: VendaStatusBadgeProps) {
  return (
    <StatusBadge
      label={getStatusLabel(status)}
      variant={variantMap[status]}
    />
  );
}
