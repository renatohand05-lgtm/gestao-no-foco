import Link from "next/link";

import { cn } from "@/lib/utils";

const CRM_LINKS = [
  { href: "crm/executivo", label: "CRM Enterprise" },
  { href: "clientes", label: "Lista" },
  { href: "clientes/central", label: "CRM Executivo" },
  { href: "clientes/funil", label: "Funil" },
  { href: "clientes/tarefas", label: "Tarefas" },
  { href: "clientes/agenda", label: "Agenda" },
  { href: "crm/retornos", label: "Retornos" },
  { href: "crm/comunicacoes", label: "Comunicações" },
  { href: "clientes/dashboard", label: "Dashboard" },
] as const;

type CrmSubnavProps = {
  tenantSlug: string;
  active: (typeof CRM_LINKS)[number]["href"];
};

export function CrmSubnav({ tenantSlug, active }: CrmSubnavProps) {
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto border-b px-4 pb-3 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
      {CRM_LINKS.map((link) => {
        const href = `/${tenantSlug}/${link.href}`;
        const isActive = active === link.href;
        return (
          <Link
            key={link.href}
            href={href}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors max-md:py-2.5",
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
