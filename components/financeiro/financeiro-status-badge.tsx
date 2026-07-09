import { StatusBadge } from "@/components/ui/status-badge";

type FinanceiroStatusBadgeProps = {
  ativo: boolean;
};

export function FinanceiroStatusBadge({ ativo }: FinanceiroStatusBadgeProps) {
  return (
    <StatusBadge
      label={ativo ? "Ativo" : "Inativo"}
      variant={ativo ? "success" : "secondary"}
    />
  );
}
