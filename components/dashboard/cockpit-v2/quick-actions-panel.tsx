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

export function QuickActionsPanel({ tenantSlug, actions }: Props) {
  return (
    <section
      aria-label="Ações rápidas"
      data-cockpit-block="quick-actions"
      data-sprint="30.4"
      className="rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-4 sm:p-5 dark:bg-[var(--brand-graphite-elevated)]/90"
    >
      <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
        Quick Actions
      </p>
      <h2 className="mt-1 text-lg font-semibold">Launcher executivo</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Personalizado pelo segmento · atalhos reais
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = ICONS[action.id] ?? ShoppingCart;
          return (
            <li key={action.id}>
              <Link
                href={`/${tenantSlug}${action.hrefSuffix}`}
                className={cn(
                  "flex min-h-11 items-start gap-2 rounded-xl border border-border/60 px-3 py-2.5",
                  "transition-colors hover:border-[var(--brand-gold)]/45",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                    ACTION_COLOR[action.id] ??
                      "bg-[var(--brand-gold)]/12 text-[var(--brand-gold)]",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{action.label}</span>
                  <span className="block text-xs text-[var(--text-muted)]">
                    {action.description}
                    {action.shortcut ? ` · ${action.shortcut}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
