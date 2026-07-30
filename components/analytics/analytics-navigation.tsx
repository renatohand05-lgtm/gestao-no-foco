"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { gofTypography } from "@/lib/design-system";

const LINKS = [
  { href: "executivo", label: "Executivo" },
  { href: "financeiro", label: "Financeiro" },
  { href: "vendas", label: "Vendas" },
  { href: "clientes", label: "Clientes" },
  { href: "operacoes", label: "Operações" },
  { href: "estoque", label: "Estoque" },
  { href: "tributario", label: "Tributário" },
  { href: "metas", label: "Metas" },
  { href: "alertas", label: "Alertas" },
  { href: "relatorios", label: "Relatórios" },
  { href: "configuracoes", label: "Configurações" },
] as const;

export function AnalyticsNavigation({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname();
  const base = `/${tenantSlug}/analytics`;

  return (
    <nav
      aria-label="Analytics"
      className="flex flex-wrap gap-1 border-b border-border/60 pb-2"
    >
      {LINKS.map((l) => {
        const href = `${base}/${l.href}`;
        const active =
          pathname === href ||
          (l.href === "executivo" && pathname === base);
        return (
          <Link
            key={l.href}
            href={href}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs transition-colors",
              gofTypography.caption,
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
