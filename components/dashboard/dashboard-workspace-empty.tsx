import Link from "next/link";
import { ClipboardPlus, PackagePlus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { brandConfig } from "@/config/brand";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
};

/**
 * Empty state do Score do dia — sem parede de zeros (Gate 19.4).
 */
export function DashboardWorkspaceEmpty({ tenantSlug }: Props) {
  const base = `/${tenantSlug}`;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 border border-border/60 bg-[var(--brand-white)] px-6 py-12 text-center",
        gofRadius.lg,
        gofMotion.fade,
      )}
      role="status"
      aria-label="Workspace sem dados"
    >
      <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
        {brandConfig.name} · {brandConfig.edition}
      </p>
      <div className="space-y-2">
        <h3 className={gofTypography.title}>Seu workspace está pronto</h3>
        <p className={cn("mx-auto max-w-md", gofTypography.subtitle)}>
          Ainda não há movimento real. Cadastre o essencial para ativar o
          cockpit — sem dados fictícios.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          className="min-h-11"
          render={<Link href={`${base}/ordens/nova`} />}
        >
          <DsIcon icon={ClipboardPlus} size="sm" className="mr-1.5" />
          Criar primeira OS
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          render={<Link href={`${base}/clientes/novo`} />}
        >
          <DsIcon icon={UserPlus} size="sm" className="mr-1.5" />
          Cadastrar cliente
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          render={<Link href={`${base}/produtos/novo`} />}
        >
          <DsIcon icon={PackagePlus} size="sm" className="mr-1.5" />
          Cadastrar produto
        </Button>
      </div>
    </div>
  );
}
