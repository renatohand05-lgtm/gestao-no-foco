import { StatusBadge } from "@/components/ui/status-badge";
import { getContaPagarStatusLabel } from "@/lib/financeiro/format";
import type { ContaPagarStatus } from "@/types/contas-pagar";

type Props = {
  status: ContaPagarStatus;
};

const VARIANTS = {
  aberto: "secondary",
  parcial: "warning",
  pago: "success",
  vencido: "danger",
  cancelado: "outline",
} as const;

export function ContaPagarStatusBadge({ status }: Props) {
  return (
    <StatusBadge
      label={getContaPagarStatusLabel(status)}
      variant={VARIANTS[status]}
    />
  );
}
