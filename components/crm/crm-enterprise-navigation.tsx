/**
 * Fase 24 — CRM Enterprise UI navigation.
 */

import Link from "next/link";

import { cn } from "@/lib/utils";

const CRM_ENTERPRISE_LINKS = [
  { href: "crm", label: "Hub" },
  { href: "crm/executivo", label: "Executivo" },
  { href: "crm/leads", label: "Leads" },
  { href: "crm/oportunidades", label: "Oportunidades" },
  { href: "crm/follow-ups", label: "Follow-ups" },
  { href: "crm/pipeline", label: "Pipeline" },
  { href: "clientes/funil", label: "Funil clientes" },
  { href: "crm/agenda", label: "Agenda CRM" },
  { href: "crm/retornos", label: "Retornos" },
  { href: "agenda", label: "Agenda" },
  { href: "crm/indicadores", label: "Indicadores" },
  { href: "crm/integracoes", label: "Integrações" },
  { href: "clientes", label: "Cadastro" },
  { href: "clientes/central", label: "Central" },
] as const;

type Props = {
  tenantSlug: string;
  active: (typeof CRM_ENTERPRISE_LINKS)[number]["href"];
};

export function CrmEnterpriseNavigation({ tenantSlug, active }: Props) {
  return (
    <nav
      className="flex flex-wrap gap-2 overflow-x-auto border-b pb-3"
      aria-label="CRM Enterprise"
    >
      {CRM_ENTERPRISE_LINKS.map((link) => {
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
