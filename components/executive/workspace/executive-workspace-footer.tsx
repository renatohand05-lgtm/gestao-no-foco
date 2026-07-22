"use client";

import Link from "next/link";

import { exAnimations, exShadow, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type QuickLink = { href: string; label: string };

type Props = {
  tenantSlug: string;
};

const QUICK_LINKS: (tenant: string) => QuickLink[] = (tenantSlug) => [
  { href: `/${tenantSlug}/configuracoes/metas`, label: "Metas" },
  { href: `/${tenantSlug}/vendas`, label: "Vendas" },
  { href: `/${tenantSlug}/financeiro/dre`, label: "DRE" },
  {
    href: `/${tenantSlug}/ordens/qualidade-operacional`,
    label: "Qualidade",
  },
  { href: `/${tenantSlug}/relatorios`, label: "Relatórios" },
];

/**
 * Links rápidos do workspace — sem duplicar “Hoje” / KPIs / Ação-Risco-Oportunidade.
 */
export function ExecutiveWorkspaceFooter({ tenantSlug }: Props) {
  const links = QUICK_LINKS(tenantSlug);

  return (
    <footer
      className={cn(
        "mt-2 rounded-2xl border border-slate-200/60 bg-white p-4 sm:p-5",
        exShadow.card,
        exAnimations.fade,
      )}
      aria-label="Links rápidos"
    >
      <nav className="flex flex-wrap gap-1.5" aria-label="Links rápidos">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border border-slate-200/80 bg-white px-3 text-xs font-medium text-slate-700",
              "hover:border-slate-300 dark:border-white/10 dark:bg-transparent dark:text-white/80",
              exAnimations.focusRing,
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className={cn(exTypography.caption, "mt-3")}>
        Atalhos · {tenantSlug}
      </p>
    </footer>
  );
}
