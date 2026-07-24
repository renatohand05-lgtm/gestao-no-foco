import Link from "next/link";

import { ExecutiveCard, ExecutiveSkeleton } from "@/components/executive";
import { gofFocusRing, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  tenantName: string;
  exportActions?: React.ReactNode;
};

/**
 * Rodapé mínimo — Design System oficial (Gate 19.1).
 * Detalhes técnicos vivem em “Informações do painel”.
 */
export function ExecutiveFooter({
  tenantSlug,
  tenantName,
  exportActions,
}: Props) {
  return (
    <footer className={cn(gofMotion.fade)} aria-label="Exportação">
      <ExecutiveCard padding={16}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={gofTypography.caption}>
            Exportar visão atual · {tenantName}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {exportActions}
            <Link
              href={`/${tenantSlug}/relatorios`}
              className={cn(
                "text-xs font-medium text-muted-foreground hover:text-foreground",
                gofFocusRing,
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
      className="space-y-2 rounded-xl border border-border/60 bg-card p-4"
      aria-busy="true"
      aria-label="Carregando rodapé"
    >
      <ExecutiveSkeleton heightClassName="h-4" widthClassName="w-1/2" />
      <ExecutiveSkeleton heightClassName="h-8" widthClassName="w-36" />
    </div>
  );
}
