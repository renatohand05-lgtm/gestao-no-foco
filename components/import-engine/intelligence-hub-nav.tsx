"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  ClipboardCheck,
  FileSpreadsheet,
  Globe,
  History,
  LayoutGrid,
  Scale,
  ShieldCheck,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";

import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type IntelligenceHubSectionId =
  | "overview"
  | "importar"
  | "revisar"
  | "conciliacao"
  | "historico"
  | "mapeamentos"
  | "regras"
  | "conectores"
  | "qualidade"
  | "auditoria";

export type IntelligenceHubNavItem = {
  id: IntelligenceHubSectionId;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Segmento após /integracoes/ — omitido para visão geral */
  match?: string;
  external?: boolean;
};

export function buildIntelligenceHubNav(tenantSlug: string): IntelligenceHubNavItem[] {
  const base = `/${tenantSlug}/integracoes`;
  return [
    {
      id: "overview",
      label: "Visão Geral",
      href: base,
      icon: LayoutDashboard,
      match: "",
    },
    {
      id: "importar",
      label: "Importar",
      href: `${base}/importar`,
      icon: FileSpreadsheet,
      match: "importar",
    },
    {
      id: "revisar",
      label: "Revisar",
      href: `${base}/revisar`,
      icon: Sparkles,
      match: "revisar",
    },
    {
      id: "conciliacao",
      label: "Conciliação",
      href: `/${tenantSlug}/financeiro/conciliacao`,
      icon: Scale,
      external: true,
    },
    {
      id: "historico",
      label: "Histórico",
      href: `${base}/historico`,
      icon: History,
      match: "historico",
    },
    {
      id: "mapeamentos",
      label: "Mapeamentos",
      href: `${base}/mapeamentos`,
      icon: LayoutGrid,
      match: "mapeamentos",
    },
    {
      id: "regras",
      label: "Regras Aprendidas",
      href: `${base}/perfis`,
      icon: Brain,
      match: "perfis",
    },
    {
      id: "conectores",
      label: "Conectores",
      href: `${base}/conectores`,
      icon: Globe,
      match: "conectores",
    },
    {
      id: "qualidade",
      label: "Qualidade dos Dados",
      href: `${base}/qualidade`,
      icon: ShieldCheck,
      match: "qualidade",
    },
    {
      id: "auditoria",
      label: "Auditoria",
      href: `${base}/auditoria`,
      icon: ClipboardCheck,
      match: "auditoria",
    },
  ];
}

type Props = {
  tenantSlug: string;
  className?: string;
};

function isActive(pathname: string, item: IntelligenceHubNavItem, base: string): boolean {
  if (item.id === "overview") {
    return pathname === base || pathname === `${base}/`;
  }
  if (item.match) {
    return (
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`) ||
      pathname.includes(`/integracoes/${item.match}`)
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Navegação principal da Central de Inteligência — scrollable chips no mobile.
 */
export function IntelligenceHubNav({ tenantSlug, className }: Props) {
  const pathname = usePathname();
  const base = `/${tenantSlug}/integracoes`;
  const items = buildIntelligenceHubNav(tenantSlug);

  return (
    <nav
      aria-label="Navegação da Central de Inteligência"
      data-intelligence-hub-nav
      className={cn(
        "overflow-x-auto rounded-xl border border-border/50 bg-card/40 p-2 shadow-sm",
        gofMotion.fade,
        className,
      )}
    >
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex min-w-max gap-1.5 sm:flex-wrap sm:min-w-0"
      >
        {items.map((item) => {
          const active = isActive(pathname, item, base);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              data-intelligence-nav={item.id}
              data-external={item.external ? "true" : "false"}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40 focus-visible:ring-offset-2",
                active
                  ? "bg-[var(--brand-graphite)] text-white shadow-sm"
                  : "bg-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  active ? "text-[var(--brand-gold)]" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span className="whitespace-nowrap text-[13px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
