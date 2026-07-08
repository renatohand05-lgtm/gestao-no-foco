import { StatusBadge } from "@/components/ui/status-badge";

type ProdutoStatusBadgeProps = {
  ativo: boolean;
};

export function ProdutoStatusBadge({ ativo }: ProdutoStatusBadgeProps) {
  return (
    <StatusBadge
      label={ativo ? "Ativo" : "Inativo"}
      variant={ativo ? "success" : "secondary"}
    />
  );
}
