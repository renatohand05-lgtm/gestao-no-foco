import Link from "next/link";
import {
  CalendarPlus,
  ClipboardPlus,
  PackagePlus,
  ShoppingCart,
  UserPlus,
  Wallet,
} from "lucide-react";

import { ExecutiveSection } from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  className?: string;
};

const ACTIONS = [
  {
    id: "os",
    label: "Criar OS",
    href: (slug: string) => `/${slug}/ordens/nova`,
    icon: ClipboardPlus,
  },
  {
    id: "venda",
    label: "Nova Venda",
    href: (slug: string) => `/${slug}/vendas/nova`,
    icon: ShoppingCart,
  },
  {
    id: "cliente",
    label: "Novo Cliente",
    href: (slug: string) => `/${slug}/clientes/novo`,
    icon: UserPlus,
  },
  {
    id: "produto",
    label: "Novo Produto",
    href: (slug: string) => `/${slug}/produtos/novo`,
    icon: PackagePlus,
  },
  {
    id: "conta",
    label: "Nova Conta",
    href: (slug: string) => `/${slug}/financeiro/contas-bancarias/novo`,
    icon: Wallet,
  },
  {
    id: "agenda",
    label: "Nova Agenda",
    href: (slug: string) => `/${slug}/clientes/agenda`,
    icon: CalendarPlus,
  },
] as const;

/**
 * Ações rápidas Enterprise — bloco inicial (Gate 19.4).
 * Sem queries; apenas links de navegação.
 */
export function DashboardQuickActions({ tenantSlug, className }: Props) {
  return (
    <ExecutiveSection
      title="Ações rápidas"
      description="Comece pelo essencial sem perder o foco."
      panel
      className={className}
    >
      <nav
        aria-label="Ações rápidas"
        className={cn(
          "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6",
          gofMotion.fade,
        )}
      >
        {ACTIONS.map((action) => (
          <Link
            key={action.id}
            href={action.href(tenantSlug)}
            className={cn(
              "group flex min-h-11 flex-col items-start gap-2 border border-border/60 bg-card px-3 py-3",
              "transition-colors hover:border-[var(--brand-gold)]/50 hover:bg-[var(--brand-gray-light)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
              gofRadius.md,
            )}
          >
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center bg-[var(--brand-gray-light)] text-[var(--brand-graphite)]",
                "group-hover:bg-[var(--brand-gold)]/15 group-hover:text-[var(--brand-graphite)]",
                gofRadius.sm,
              )}
            >
              <DsIcon icon={action.icon} size="sm" />
            </span>
            <span className={cn(gofTypography.caption, "font-medium text-foreground")}>
              {action.label}
            </span>
          </Link>
        ))}
      </nav>
    </ExecutiveSection>
  );
}
