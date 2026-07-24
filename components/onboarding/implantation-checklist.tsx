"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { brandConfig } from "@/config/brand";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { OnboardingChecklistResult } from "@/lib/onboarding";

/** Mapeamento visual Gate 19.4 — sem novos IDs/queries. */
const IMPLANT_LABELS: Record<string, string> = {
  empresa: "Empresa",
  segmento: "Empresa",
  conta_bancaria: "Financeiro",
  meta_mensal: "Financeiro",
  cliente: "Clientes",
  produto: "Produtos",
  venda: "Primeira OS",
  dashboard: "Dashboard",
};

type Props = {
  tenantSlug: string;
  checklist: OnboardingChecklistResult;
};

/**
 * Checklist de implantação — esconde-se quando 100% (pai decide).
 */
export function ImplantationChecklist({ tenantSlug, checklist }: Props) {
  const seen = new Set<string>();
  const items = checklist.items.filter((item) => {
    const label = IMPLANT_LABELS[item.id] ?? item.title;
    if (seen.has(label)) return false;
    seen.add(label);
    return item.id !== "dashboard";
  });

  return (
    <section
      className={cn(
        "border border-border/60 bg-[var(--brand-white)] p-4 sm:p-5",
        gofRadius.lg,
        gofMotion.fade,
      )}
      aria-label="Checklist de implantação"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
            Implantação · {brandConfig.name}
          </p>
          <h2 className={cn(gofTypography.title, "mt-1")}>
            Checklist da empresa nova
          </h2>
          <p className={cn(gofTypography.subtitle, "mt-1")}>
            {checklist.completedCount} de {checklist.totalCount} ·{" "}
            {checklist.progressPct}%
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="min-h-11"
          render={<Link href={`/${tenantSlug}/primeiro-acesso`} />}
        >
          Abrir onboarding
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const label = IMPLANT_LABELS[item.id] ?? item.title;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-2 py-2",
                  "hover:bg-[var(--brand-gray-light)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                )}
              >
                <DsIcon
                  icon={item.completed ? Check : Circle}
                  size="sm"
                  className={
                    item.completed
                      ? "text-[var(--brand-gold)]"
                      : "text-muted-foreground"
                  }
                />
                <span
                  className={cn(
                    gofTypography.caption,
                    "font-medium",
                    item.completed && "text-muted-foreground line-through",
                  )}
                >
                  {label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.completed ? "Pronto" : item.ctaLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
