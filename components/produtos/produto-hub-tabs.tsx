import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  currentTipo: string;
};

const TABS = [
  { value: "all", label: "Todos", query: "" },
  { value: "produto", label: "Produtos", query: "tipo=produto" },
  { value: "servico", label: "Serviços", query: "tipo=servico" },
] as const;

export function ProdutoHubTabs({ tenantSlug, currentTipo }: Props) {
  return (
    <div
      className="flex flex-wrap gap-1 border-b border-border/60 pb-px"
      role="tablist"
      aria-label="Tipo de catálogo"
    >
      {TABS.map((tab) => {
        const active =
          tab.value === "all"
            ? currentTipo === "all"
            : currentTipo === tab.value;
        const href = tab.query
          ? `/${tenantSlug}/produtos?${tab.query}`
          : `/${tenantSlug}/produtos`;
        return (
          <Link
            key={tab.value}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-t-md px-3 py-2 text-sm transition-colors",
              active
                ? "border border-b-0 border-border/60 bg-card font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
