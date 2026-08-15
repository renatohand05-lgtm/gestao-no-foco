import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  active:
    | "lista"
    | "dashboard"
    | "nova"
    | "mecanicos"
    | "cadastro"
    | "templates";
  copy?: {
    professionals: string;
    newWorkOrder: string;
    professionalsListPath: "/oficina/mecanicos" | "/profissionais";
  };
};

const OFICINA_SUBNAV = {
  professionals: "Mecânicos",
  newWorkOrder: "Nova OS",
  professionalsListPath: "/oficina/mecanicos" as const,
};

export function OsSubnav({ tenantSlug, active, copy = OFICINA_SUBNAV }: Props) {
  const items = [
    { key: "lista" as const, href: `/${tenantSlug}/ordens`, label: "Central" },
    {
      key: "dashboard" as const,
      href: `/${tenantSlug}/ordens/dashboard`,
      label: "Dashboard",
    },
    {
      key: "mecanicos" as const,
      href: `/${tenantSlug}/ordens/mecanicos`,
      label: copy.professionals,
    },
    {
      key: "cadastro" as const,
      href: `/${tenantSlug}${copy.professionalsListPath}`,
      label: "Cadastro",
    },
    {
      key: "templates" as const,
      href: `/${tenantSlug}/ordens/templates`,
      label: "Templates",
    },
    {
      key: "nova" as const,
      href: `/${tenantSlug}/ordens/nova`,
      label: copy.newWorkOrder,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            buttonVariants({
              variant: active === item.key ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href={`/${tenantSlug}/ordens/qualidade-operacional`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Qualidade
      </Link>
      <Link
        href={`/${tenantSlug}/centro-operacoes`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Centro de Ops
      </Link>
    </div>
  );
}
