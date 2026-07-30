/**
 * Fase 25 — Navegação Supply / Compras Enterprise.
 */

import Link from "next/link";

import { cn } from "@/lib/utils";

export const SUPPLY_ENTERPRISE_LINKS = [
  { href: "compras", label: "Hub" },
  { href: "compras/executivo", label: "Executivo" },
  { href: "compras/pedidos", label: "Pedidos" },
  { href: "compras/almoxarifado", label: "Almoxarifado" },
  { href: "compras/inventario", label: "Inventário" },
  { href: "compras/indicadores", label: "Indicadores" },
  { href: "compras/inteligencia", label: "Inteligência" },
  { href: "produtos", label: "Catálogo" },
  { href: "estoque", label: "Estoque" },
  { href: "financeiro/fornecedores", label: "Fornecedores" },
] as const;

type Props = {
  tenantSlug: string;
  active: (typeof SUPPLY_ENTERPRISE_LINKS)[number]["href"];
};

export function SupplyEnterpriseNavigation({ tenantSlug, active }: Props) {
  return (
    <nav
      className="flex flex-wrap gap-2 overflow-x-auto border-b pb-3"
      aria-label="Compras e Supply Chain"
    >
      {SUPPLY_ENTERPRISE_LINKS.map((link) => {
        const href = `/${tenantSlug}/${link.href}`;
        const isActive = active === link.href;
        return (
          <Link
            key={link.href}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
