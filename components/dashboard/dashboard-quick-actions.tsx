"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest("[role='textbox'], [contenteditable='true']"));
}

/**
 * Launcher executivo — atalhos reais quando o painel está aberto (Sprint 26.4).
 */
export function DashboardQuickActions({ tenantSlug, className }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const root = rootRef.current;
      if (!root) return;
      // Só ativa se o launcher estiver no DOM visível (painel aberto)
      if (root.offsetParent === null && getComputedStyle(root).display === "none") {
        return;
      }
      const key = e.key.toUpperCase();
      const action = ACTIONS.find((a) => a.shortcut === key);
      if (!action) return;
      e.preventDefault();
      router.push(action.href(tenantSlug));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, tenantSlug]);

  return (
    <GFSection
      title="Launcher executivo"
      description="Atalhos do dia · teclas O V C P B A quando este painel está aberto."
      className={className}
      surface="elevated"
    >
      <nav
        ref={rootRef}
        aria-label="Ações rápidas"
        data-gf-launcher=""
        data-sprint="26.4"
        data-launcher-shortcuts="1"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ACTIONS.map((action) => (
          <Link
            key={action.id}
            href={action.href(tenantSlug)}
            className={cn(
              "group flex min-h-11 items-start gap-3 rounded-xl border border-[var(--gf-border-subtle)]",
              "bg-[var(--gf-surface-raised)] p-3",
              "transition-[border-color,background-color,transform] duration-[var(--gf-motion-micro)] ease-[var(--gf-ease)]",
              "hover:border-[var(--gf-border-active)] hover:bg-[var(--gf-surface-interactive)]",
              "motion-safe:hover:-translate-y-px",
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
                  title={`Atalho ${action.shortcut}`}
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
