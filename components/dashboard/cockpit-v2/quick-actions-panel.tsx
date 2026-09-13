import Link from "next/link";
import {
  ClipboardPlus,
  FileSpreadsheet,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  Upload,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import type { QuickActionDef } from "@/config/dashboard/cockpit-v2";
import { cn } from "@/lib/utils";

/** Server Component — Sprint 30.4.1 (sem hooks; menos hidratação). */

const ICONS: Record<string, typeof ShoppingCart> = {
  venda: ShoppingCart,
  os: ClipboardPlus,
  cliente: UserPlus,
  conta: Wallet,
  orcamento: FileSpreadsheet,
  compra: ShoppingBag,
  produto: PackagePlus,
  servico: Wrench,
  membro: Users,
  importar: Upload,
};

const ACTION_COLOR: Record<string, string> = {
  venda: "bg-blue-500/15 text-blue-400",
  os: "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]",
  cliente: "bg-indigo-500/15 text-indigo-400",
  conta: "bg-teal-500/15 text-teal-400",
  orcamento: "bg-violet-500/15 text-violet-400",
  compra: "bg-orange-500/15 text-orange-400",
  produto: "bg-emerald-500/15 text-emerald-400",
  servico: "bg-amber-500/15 text-amber-400",
  membro: "bg-pink-500/15 text-pink-400",
  importar: "bg-sky-500/15 text-sky-400",
};

type Props = {
  tenantSlug: string;
  actions: QuickActionDef[];
};

/**
 * Barra compacta de ações rápidas — Sprint 30.4.2 (alinhado à referência
 * visual do Renato: chips pequenos com ícone + rótulo, sem descrição longa,
 * uma única faixa horizontal em vez de um grid grande de cards.
 */
export function QuickActionsPanel({ tenantSlug, actions }: Props) {
  return (
    <section
      aria-label="Ações rápidas"
      data-cockpit-block="quick-actions"
      data-sprint="30.4.2"
      className="rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-3 sm:p-4 dark:bg-[var(--brand-graphite-elevated)]/90"
    >
      <p className="mb-2.5 text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
        Ações rápidas
      </p>

      <ul className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = ICONS[action.id] ?? ShoppingCart;
          return (
            <li key={action.id}>
              <Link
                href={`/${tenantSlug}${action.hrefSuffix}`}
                title={action.description}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-xl border border-border/50 pl-1.5 pr-3",
                  "text-xs font-medium transition-colors hover:border-[var(--brand-gold)]/45",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-lg",
                    ACTION_COLOR[action.id] ??
                      "bg-[var(--brand-gold)]/12 text-[var(--brand-gold)]",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {action.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
