import { StatusBadge } from "@/components/ui/status-badge";

type ClienteStatusBadgeProps = {
  ativo: boolean;
};

export function ClienteStatusBadge({ ativo }: ClienteStatusBadgeProps) {
  return (
    <StatusBadge
      label={ativo ? "Ativo" : "Inativo"}
      variant={ativo ? "success" : "secondary"}
    />
  );
}
