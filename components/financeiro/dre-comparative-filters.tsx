"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { GFSelect } from "@/components/gf/gf-select";
import { buttonVariants } from "@/components/ui/button";
import { MONTH_LABELS_PT } from "@/lib/dre/dre-compare";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  year: number;
  mesA: number;
  mesB: number;
};

export function DreComparativeFilters({
  tenantSlug,
  year,
  mesA,
  mesB,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("comparativo", "1");
    Object.entries(updates).forEach(([k, v]) => params.set(k, v));
    startTransition(() => {
      router.push(`/${tenantSlug}/financeiro/dre?${params.toString()}`);
    });
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: String(y), label: String(y) };
  });

  const monthOptions = MONTH_LABELS_PT.map((label, idx) => ({
    value: String(idx + 1),
    label,
  }));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="space-y-1.5 min-w-28">
        <p className="text-xs font-medium text-muted-foreground">Ano</p>
        <GFSelect
          value={String(year)}
          onValueChange={(v) => push({ ano: v })}
          options={yearOptions}
          disabled={pending}
          aria-label="Ano"
        />
      </div>
      <div className="space-y-1.5 min-w-40">
        <p className="text-xs font-medium text-muted-foreground">Mês A</p>
        <GFSelect
          value={String(mesA)}
          onValueChange={(v) => push({ mesA: v })}
          options={monthOptions}
          disabled={pending}
          aria-label="Mês A"
        />
      </div>
      <div className="space-y-1.5 min-w-40">
        <p className="text-xs font-medium text-muted-foreground">Mês B</p>
        <GFSelect
          value={String(mesB)}
          onValueChange={(v) => push({ mesB: v })}
          options={monthOptions}
          disabled={pending}
          aria-label="Mês B"
        />
      </div>
      <Link
        href={`/${tenantSlug}/financeiro/dre`}
        className={cn(buttonVariants({ variant: "outline" }), pending && "pointer-events-none opacity-50")}
      >
        Modo período único
      </Link>
    </div>
  );
}
