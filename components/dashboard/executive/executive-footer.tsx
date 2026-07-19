import Link from "next/link";

import { ExecutiveCard } from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  tenantName: string;
  exportActions?: React.ReactNode;
};

/**
 * Rodapé mínimo — exportações reais (Sprint 12.4).
 * Detalhes técnicos vivem em “Informações do painel”.
 */
export function ExecutiveFooter({
  tenantSlug,
  tenantName,
  exportActions,
}: Props) {
  return (
    <footer className={cn(exAnimations.fade)} aria-label="Exportação">
      <ExecutiveCard
        padding={16}
        className="border-slate-200/50 bg-white dark:border-white/10"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={exTypography.caption}>
            Exportar visão atual · {tenantName}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {exportActions}
            <Link
              href={`/${tenantSlug}/relatorios`}
              className={cn(
                "text-xs font-medium text-slate-600 hover:text-slate-900",
                exAnimations.focusRing,
              )}
            >
              Relatórios →
            </Link>
          </div>
        </div>
      </ExecutiveCard>
    </footer>
  );
}

export function ExecutiveFooterSkeleton() {
  return (
    <div
      className="h-16 animate-pulse rounded-2xl bg-white/60"
      aria-busy="true"
      aria-label="Carregando rodapé"
    />
  );
}
