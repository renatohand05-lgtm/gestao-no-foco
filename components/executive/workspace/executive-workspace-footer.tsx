"use client";

import Link from "next/link";

import {
  gofCardSurface,
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
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
 * Links rápidos do workspace — DS oficial (Gate 19.4.1).
 */
export function ExecutiveWorkspaceFooter({ tenantSlug }: Props) {
  const links = QUICK_LINKS(tenantSlug);

  return (
    <footer
      className={cn("mt-2 p-4 sm:p-5", gofCardSurface, gofMotion.fade)}
      aria-label="Links rápidos"
    >
      <nav className="flex flex-wrap gap-1.5" aria-label="Links rápidos">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex min-h-11 items-center border border-border/60 bg-[var(--brand-white)] px-3 text-xs font-medium",
              gofRadius.sm,
              gofFocusRing,
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className={cn(gofTypography.caption, "mt-3")}>
        Atalhos · {tenantSlug}
      </p>
    </footer>
  );
}
