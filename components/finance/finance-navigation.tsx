"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  Calculator,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  PieChart,
  Receipt,
  Repeat,
  Scale,
  Tags,
  Upload,
  Wallet,
  Archive,
  Landmark,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { isFinanceLegacyMenuEnabled } from "@/lib/finance/finance-feature-flags";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type FinanceNavGroupId =
  | "tesouraria"
  | "operacoes"
  | "planejamento"
  | "relatorios"
  | "configuracoes"
  | "legado";

export type FinanceNavItem = {
  href: string;
  label: string;
  group: FinanceNavGroupId;
  permission?: string;
  legacy?: boolean;
  enterprise?: boolean;
};

export const FINANCE_NAV_GROUPS: {
  id: FinanceNavGroupId;
  label: string;
}[] = [
  { id: "tesouraria", label: "Tesouraria" },
  { id: "operacoes", label: "Operações" },
  { id: "planejamento", label: "Planejamento" },
  { id: "relatorios", label: "Relatórios" },
  { id: "configuracoes", label: "Configurações" },
  { id: "legado", label: "Legado" },
];

export const FINANCE_NAV_ITEMS: readonly FinanceNavItem[] = [
  {
    href: "",
    label: "Dashboard",
    group: "tesouraria",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "contas",
    label: "Contas bancárias",
    group: "tesouraria",
    permission: "financeiro.contas.visualizar",
    enterprise: true,
  },
  {
    href: "movimentacoes",
    label: "Movimentações",
    group: "tesouraria",
    permission: "financeiro.movimentacoes.visualizar",
    enterprise: true,
  },
  {
    href: "transferencias",
    label: "Transferências",
    group: "tesouraria",
    permission: "financeiro.transferir",
    enterprise: true,
  },
  {
    href: "fluxo-caixa",
    label: "Fluxo de caixa",
    group: "tesouraria",
    permission: "financeiro.ver_fluxo_caixa",
    enterprise: true,
  },
  {
    href: "caixa",
    label: "Caixa & Projeção",
    group: "tesouraria",
    permission: "financeiro.ver_fluxo_caixa",
    enterprise: true,
  },
  {
    href: "conciliacao",
    label: "Conciliação",
    group: "tesouraria",
    permission: "financeiro.criar",
    enterprise: true,
  },
  {
    href: "contas-pagar",
    label: "Contas a pagar",
    group: "operacoes",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "contas-receber",
    label: "Contas a receber",
    group: "operacoes",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "categorias",
    label: "Categorias",
    group: "planejamento",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "centros-custo",
    label: "Centros de custo",
    group: "planejamento",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "plano-contas",
    label: "Plano de contas",
    group: "planejamento",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "dre",
    label: "DRE",
    group: "relatorios",
    permission: "financeiro.ver_dre",
    enterprise: true,
  },
  {
    href: "tributos",
    label: "Tributos Enterprise",
    group: "relatorios",
    permission: "financeiro.tributos.visualizar",
    enterprise: true,
  },
  {
    href: "inteligencia",
    label: "Inteligência",
    group: "relatorios",
    permission: "dashboard.financeiro",
    enterprise: true,
  },
  {
    href: "fornecedores",
    label: "Fornecedores",
    group: "configuracoes",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "formas-pagamento",
    label: "Formas de pagamento",
    group: "configuracoes",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "despesas-recorrentes",
    label: "Despesas recorrentes",
    group: "configuracoes",
    permission: "financeiro.visualizar",
    enterprise: true,
  },
  {
    href: "importar",
    label: "Importar Dados",
    group: "configuracoes",
    permission: "financeiro.criar",
    enterprise: true,
  },
  {
    href: "contas-bancarias",
    label: "Contas bancárias (UI antiga)",
    group: "legado",
    legacy: true,
    enterprise: false,
  },
] as const;

const NAV_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  contas: Wallet,
  movimentacoes: ListOrdered,
  transferencias: ArrowLeftRight,
  "fluxo-caixa": LineChart,
  caixa: Wallet,
  conciliacao: Scale,
  "contas-pagar": Receipt,
  "contas-receber": Banknote,
  categorias: Tags,
  "centros-custo": Building2,
  "plano-contas": FolderTree,
  dre: Scale,
  tributos: Landmark,
  inteligencia: PieChart,
  fornecedores: Building2,
  "formas-pagamento": CreditCard,
  "despesas-recorrentes": Repeat,
  importar: Upload,
  "contas-bancarias": Archive,
  default: Calculator,
};

export function getVisibleFinanceNavItems(
  showLegacy = isFinanceLegacyMenuEnabled(),
): FinanceNavItem[] {
  return FINANCE_NAV_ITEMS.filter((item) => (item.legacy ? showLegacy : true));
}

function iconFor(href: string): LucideIcon {
  if (!href) return NAV_ICONS.overview!;
  return NAV_ICONS[href] ?? NAV_ICONS.default!;
}

type Props = {
  tenantSlug: string;
  className?: string;
  showLegacy?: boolean;
};

export function FinanceNavigation({
  tenantSlug,
  className,
  showLegacy,
}: Props) {
  const pathname = usePathname();
  const base = `/${tenantSlug}/financeiro`;
  const legacy =
    typeof showLegacy === "boolean" ? showLegacy : isFinanceLegacyMenuEnabled();
  const items = getVisibleFinanceNavItems(legacy);

  return (
    <nav
      data-finance-navigation
      data-finance-legacy={legacy ? "true" : "false"}
      aria-label="Navegação financeira"
      className={cn(
        "overflow-x-auto rounded-xl border border-border/50 bg-card/40 p-3 shadow-sm sm:overflow-visible",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
        {FINANCE_NAV_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group.id);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.id} data-finance-nav-group={group.id}>
              <p
                className={cn(
                  gofTypography.caption,
                  "mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                )}
              >
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {groupItems.map((item) => {
                  const href = item.href ? `${base}/${item.href}` : base;
                  const active =
                    item.href === ""
                      ? pathname === base || pathname === `${base}/`
                      : pathname === href || pathname.startsWith(`${href}/`);
                  const Icon = iconFor(item.href || "overview");
                  return (
                    <Link
                      key={`${group.id}-${item.href || "overview"}`}
                      href={href}
                      data-finance-nav={item.href || "overview"}
                      data-active={active ? "true" : "false"}
                      data-enterprise={
                        item.enterprise !== false ? "true" : "false"
                      }
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group inline-flex h-9 max-w-full items-center gap-2 rounded-lg px-2.5 text-sm transition-colors duration-150",
                        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40 focus-visible:ring-offset-2",
                        active
                          ? "bg-[var(--brand-graphite)] text-white shadow-sm"
                          : "bg-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          active
                            ? "text-[var(--brand-gold)]"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                        aria-hidden
                      />
                      <span className="truncate text-[13px] font-medium">
                        {item.label}
                      </span>
                      {item.legacy ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 border-white/30 px-1 text-[9px] uppercase",
                            active
                              ? "border-white/30 text-white/80"
                              : "text-muted-foreground",
                          )}
                        >
                          legado
                        </Badge>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
