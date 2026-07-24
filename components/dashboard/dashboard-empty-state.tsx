import {
  AlertCircle,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import { ExecutiveEmptyState } from "@/components/executive";
import { gofColors } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type EmptyStateIconKey = "empty" | "error";

const EMPTY_STATE_ICON_MAP: Record<EmptyStateIconKey, LucideIcon> = {
  empty: Inbox,
  error: AlertCircle,
};

type DashboardEmptyStateProps = {
  variant?: EmptyStateIconKey;
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

/**
 * Empty / error premium do Dashboard — identidade GESTÃO (Gate 19.3).
 */
export function DashboardEmptyState({
  variant = "empty",
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: DashboardEmptyStateProps) {
  const isError = variant === "error";
  const Icon = EMPTY_STATE_ICON_MAP[variant];

  return (
    <ExecutiveEmptyState
      className={cn(
        isError && cn(gofColors.danger.soft, "ring-1", gofColors.danger.border),
        className,
      )}
      icon={Icon}
      title={
        title ??
        (isError
          ? "Não foi possível carregar o Dashboard Executivo"
          : "Ainda não há indicadores para exibir")
      }
      description={
        description ??
        (isError
          ? "A GESTÃO não conseguiu montar esta seção. Verifique a conexão e recarregue."
          : "Cadastre vendas, metas e movimentações financeiras para ativar a leitura executiva.")
      }
      action={
        actionHref
          ? {
              label:
                actionLabel ??
                (isError ? "Recarregar dashboard" : "Ir para vendas"),
              href: actionHref,
            }
          : undefined
      }
    />
  );
}
