import { StatusBadge } from "@/components/ui/status-badge";
import { getContaReceberStatusLabel } from "@/lib/financeiro/format";
import type { ContaReceberStatus } from "@/types/contas-receber";

type Props = {
  status: ContaReceberStatus;
};

const VARIANTS = {
  aberto: "secondary",
  recebido: "success",
  vencido: "danger",
  cancelado: "outline",
} as const;

export function ContaReceberStatusBadge({ status }: Props) {
  return (
    <StatusBadge
      label={getContaReceberStatusLabel(status)}
      variant={VARIANTS[status]}
    />
  );
}
