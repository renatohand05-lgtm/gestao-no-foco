import Link from "next/link";

import { cn } from "@/lib/utils";

const CRM_LINKS = [
  { href: "clientes", label: "Lista" },
  { href: "clientes/funil", label: "Funil" },
  { href: "clientes/tarefas", label: "Tarefas" },
  { href: "clientes/agenda", label: "Agenda" },
  { href: "clientes/dashboard", label: "Dashboard" },
] as const;

type CrmSubnavProps = {
  tenantSlug: string;
  active: (typeof CRM_LINKS)[number]["href"];
};

export function CrmSubnav({ tenantSlug, active }: CrmSubnavProps) {
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {CRM_LINKS.map((link) => {
        const href = `/${tenantSlug}/${link.href}`;
        const isActive = active === link.href;
        return (
          <Link
            key={link.href}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
