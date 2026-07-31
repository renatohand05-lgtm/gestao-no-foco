"use client";

import Link from "next/link";
import {
  CalendarPlus,
  ClipboardPlus,
  PackagePlus,
  ShoppingCart,
  UserPlus,
  Wallet,
} from "lucide-react";

import { GFIcon } from "@/components/gf/gf-icon";
import { GFSection } from "@/components/gf/gf-section";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  className?: string;
};

const ACTIONS = [
  {
    id: "os",
    label: "Criar OS",
    description: "Abrir uma nova ordem de serviço",
    href: (slug: string) => `/${slug}/ordens/nova`,
    icon: ClipboardPlus,
    shortcut: "O",
  },
  {
    id: "venda",
    label: "Nova venda",
    description: "Registrar uma nova venda",
    href: (slug: string) => `/${slug}/vendas/nova`,
    icon: ShoppingCart,
    shortcut: "V",
  },
  {
    id: "cliente",
    label: "Novo cliente",
    description: "Cadastrar novo cliente",
    href: (slug: string) => `/${slug}/clientes/novo`,
    icon: UserPlus,
    shortcut: "C",
  },
  {
    id: "produto",
    label: "Novo produto",
    description: "Incluir produto no catálogo",
    href: (slug: string) => `/${slug}/produtos/novo`,
    icon: PackagePlus,
    shortcut: "P",
  },
  {
    id: "conta",
    label: "Nova conta",
    description: "Conta bancária no tesouro",
    href: (slug: string) => `/${slug}/financeiro/contas-bancarias/novo`,
    icon: Wallet,
    shortcut: "B",
  },
  {
    id: "agenda",
    label: "Nova agenda",
    description: "Compromisso comercial",
    href: (slug: string) => `/${slug}/clientes/agenda`,
    icon: CalendarPlus,
    shortcut: "A",
  },
] as const;

/**
 * Launcher executivo — ações rápidas com contexto (Sprint 26.2).
 */
export function DashboardQuickActions({ tenantSlug, className }: Props) {
  return (
    <GFSection
      title="Launcher executivo"
      description="Atalhos do dia · sem inventar atalhos de teclado globais."
      className={className}
      surface="elevated"
    >
      <nav
        aria-label="Ações rápidas"
        data-gf-launcher=""
        data-sprint="26.2"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ACTIONS.map((action) => (
          <Link
            key={action.id}
            href={action.href(tenantSlug)}
            className={cn(
              "group flex min-h-11 items-start gap-3 rounded-xl border border-[var(--gf-border-subtle)]",
              "bg-[var(--gf-surface-raised)] p-3 transition-colors",
              "hover:border-[var(--gf-border-active)] hover:bg-[var(--gf-surface-interactive)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
            )}
          >
            <GFIcon icon={action.icon} size="md" variant="primary" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className={cn(gfType.cardTitle)}>{action.label}</span>
                <kbd
                  className={cn(
                    gfType.caption,
                    "hidden rounded border border-[var(--gf-border-subtle)] px-1.5 py-0.5 sm:inline",
                  )}
                >
                  {action.shortcut}
                </kbd>
              </span>
              <span className={cn(gfType.caption, "mt-0.5 block text-pretty")}>
                {action.description}
              </span>
            </span>
          </Link>
        ))}
      </nav>
    </GFSection>
  );
}
