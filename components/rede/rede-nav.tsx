"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function RedeNav({ base, itens }: { base: string; itens: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções da rede de lojas" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {itens.map((i) => {
        const href = `${base}${i.href}`;
        const ativo = i.href === "" ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={i.href || "geral"}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
