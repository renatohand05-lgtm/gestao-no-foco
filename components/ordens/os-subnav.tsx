import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  active: "lista" | "dashboard" | "nova" | "mecanicos" | "cadastro";
};

export function OsSubnav({ tenantSlug, active }: Props) {
  const items = [
    { key: "lista" as const, href: `/${tenantSlug}/ordens`, label: "Lista" },
    {
      key: "dashboard" as const,
      href: `/${tenantSlug}/ordens/dashboard`,
      label: "Dashboard",
    },
    {
      key: "mecanicos" as const,
      href: `/${tenantSlug}/ordens/mecanicos`,
      label: "Mecânicos",
    },
    {
      key: "cadastro" as const,
      href: `/${tenantSlug}/oficina/mecanicos`,
      label: "Cadastro",
    },
    {
      key: "nova" as const,
      href: `/${tenantSlug}/ordens/nova`,
      label: "Nova OS",
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
