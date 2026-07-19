import {
  AlertCircle,
  BarChart3,
  Inbox,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type EmptyStateIconKey = "empty" | "error";

const EMPTY_STATE_ICON_MAP: Record<EmptyStateIconKey, LucideIcon> = {
  empty: Inbox,
  error: AlertCircle,
};

const EMPTY_STATE_ACTION_ICON_MAP: Record<EmptyStateIconKey, LucideIcon> = {
  empty: BarChart3,
  error: RefreshCw,
};

type DashboardEmptyStateProps = {
  variant?: EmptyStateIconKey;
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

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
  const ActionIcon = EMPTY_STATE_ACTION_ICON_MAP[variant];

  return (
    <EmptyState
      className={cn(
        isError
          ? "border-rose-200/60 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20"
          : undefined,
        className,
      )}
      icon={Icon}
      title={
        title ??
        (isError
          ? "Não foi possível carregar o dashboard"
          : "Ainda não há dados para exibir")
      }
      description={
        description ??
        (isError
          ? "Verifique sua conexão e tente novamente. Se o problema persistir, contate o suporte."
          : "Cadastre clientes, registre vendas e movimente o financeiro para ver os indicadores.")
      }
      action={
        actionHref
          ? {
              label:
                actionLabel ??
                (isError ? "Tentar novamente" : "Ir para vendas"),
              href: actionHref,
              icon: ActionIcon,
            }
          : undefined
      }
    />
  );
}
