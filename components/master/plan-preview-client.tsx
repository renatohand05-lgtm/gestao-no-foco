"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startPlanSimulationAction } from "@/lib/platform/plan-simulation-actions";

type PlanPreview = {
  slug: string;
  name: string;
  priceLabel: string;
  maxSeats: number;
};

type FeaturePreview = {
  id: string;
  label: string;
  minPlanLabel: string;
  unlocked: boolean;
};

type TenantOption = { slug: string; name: string };

type Props = {
  plans: PlanPreview[];
  coreLabels: string[];
  featuresByPlan: Record<string, FeaturePreview[]>;
  tenants: TenantOption[];
};

export function PlanPreviewClient({
  plans,
  coreLabels,
  featuresByPlan,
  tenants,
}: Props) {
  const [selectedSlug, setSelectedSlug] = useState(plans[0]?.slug ?? "");
  const [targetTenant, setTargetTenant] = useState(tenants[0]?.slug ?? "");
  const selectedPlan = plans.find((p) => p.slug === selectedSlug) ?? plans[0];
  const features = featuresByPlan[selectedSlug] ?? [];
  const unlocked = features.filter((f) => f.unlocked);
  const locked = features.filter((f) => !f.unlocked);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {plans.map((plan) => (
          <Button
            key={plan.slug}
            type="button"
            size="sm"
            variant={plan.slug === selectedSlug ? "default" : "outline"}
            onClick={() => setSelectedSlug(plan.slug)}
          >
            {plan.name}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border-2 border-[var(--brand-gold,#C9A84C)] bg-[var(--brand-gold,#C9A84C)]/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold,#C9A84C)]">
          Você está vendo agora
        </p>
        <p className="mt-1 text-xl font-bold text-foreground">
          {selectedPlan?.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {selectedPlan?.priceLabel}
        </p>

        {tenants.length > 0 ? (
          <form
            action={startPlanSimulationAction.bind(null, selectedSlug, targetTenant)}
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--brand-gold,#C9A84C)]/30 pt-3"
          >
            <label className="text-xs text-muted-foreground">
              Ver dentro de
              <select
                className="ml-2 rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs"
                value={targetTenant}
                onChange={(e) => setTargetTenant(e.target.value)}
              >
                {tenants.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" disabled={!targetTenant}>
              Ver no app real com este plano
            </Button>
          </form>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-card/40 p-5">
        <p className="text-sm text-muted-foreground">
          Até {selectedPlan?.maxSeats} logins (dono + equipe)
        </p>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Liberado neste plano
            </p>
            <ul className="space-y-1.5">
              {coreLabels.map((label) => (
                <li
                  key={label}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <Badge variant="success" className="mt-0.5 shrink-0">
                    core
                  </Badge>
                  {label}
                </li>
              ))}
              {unlocked.map((f) => (
                <li
                  key={f.id}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <Badge variant="success" className="mt-0.5 shrink-0">
                    liberado
                  </Badge>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Travado — desperta upgrade
            </p>
            {locked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada travado — este plano já libera tudo.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {locked.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                    {f.label}
                    <Badge variant="outline" className="ml-auto shrink-0">
                      {f.minPlanLabel}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Essa distribuição reflete o que foi decidido nas sessões de produto —
        os cadeados de verdade nas telas do financeiro (Fase 2) ainda não
        foram implementados; isto aqui é a referência única de qual plano
        libera cada recurso.
      </p>
    </div>
  );
}
