"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";

import { requestPlanChangeAction } from "@/lib/billing/actions";
import {
  formatBrlFromCents,
  listCommercialPlans,
  type CommercialPlanSlug,
} from "@/lib/billing/catalog";
import { Button } from "@/components/ui/button";
import { useBillingSelection } from "./billing-selection-context";

type Props = {
  tenantSlug: string;
  canManage: boolean;
  currentPlanSlug: string | null;
};

/**
 * Textos e listas de recurso reais, na mesma ordem/critério da matriz de
 * liberação por plano (lib/billing/plan-feature-matrix.ts) — nunca
 * promete algo que o plano não libera de verdade.
 */
const PLAN_COPY: Record<
  CommercialPlanSlug,
  { tagline: string; features: string[] }
> = {
  start: {
    tagline: "Pra organizar o dia a dia da operação",
    features: [
      "Vendas e ordens de serviço",
      "Agenda e estoque",
      "Financeiro básico (caixa, contas, DRE)",
      "Inteligência Comercial",
    ],
  },
  essential: {
    tagline: "Pra quem já vive de cliente recorrente",
    features: [
      "Tudo do Início, mais:",
      "CRM e relatórios",
      "Financeiro avançado (centros de custo, conciliação, orçamento)",
      "Assistente de IA dentro do sistema",
    ],
  },
  management: {
    tagline: "Visão completa pra decidir com dado",
    features: ["Tudo do Essencial, mais:", "Analytics e BI do negócio"],
  },
  pro: {
    tagline: "Pra operação que já roda em escala",
    features: [
      "Tudo do Gestão, mais:",
      "Tributário",
      "Integrações com outros sistemas",
      "Automações",
    ],
  },
  pro_plus_consulting: {
    tagline: "Time dedicado ajudando você a crescer",
    features: ["Tudo do Pro, mais:", "Consultoria humana dedicada"],
  },
};

export function BillingCatalogPanel({
  tenantSlug,
  canManage,
  currentPlanSlug,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selectedPlanSlug, selectPlan } = useBillingSelection();
  const plans = listCommercialPlans();

  function onSelect(slug: string) {
    setMessage(null);
    setError(null);
    selectPlan(slug);
    startTransition(async () => {
      const res = await requestPlanChangeAction({
        tenantSlug,
        targetPlanSlug: slug,
      });
      if (res.ok) setMessage(res.message);
      else setError(res.message);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Escolha o plano ideal pro seu negócio
        </p>
        <p className="text-xs text-muted-foreground">
          Sem contrato de fidelidade — mude ou cancele quando quiser.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const current = currentPlanSlug === plan.slug;
          const selected = selectedPlanSlug === plan.slug;
          const copy = PLAN_COPY[plan.slug];

          return (
            <div
              key={plan.slug}
              data-plan-slug={plan.slug}
              data-recommended={plan.recommended ? "true" : "false"}
              data-selected={selected ? "true" : "false"}
              className={`relative flex flex-col rounded-2xl border p-5 transition ${
                plan.recommended
                  ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/[0.06] shadow-[0_0_0_1px_rgb(201_168_76_/0.15),0_8px_28px_-8px_rgb(201_168_76_/0.35)]"
                  : selected
                    ? "border-primary bg-primary/5"
                    : "border-border/70 hover:border-border"
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-[var(--brand-gold)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--brand-navy)]">
                  <Sparkles className="size-3" aria-hidden />
                  Mais escolhido
                </span>
              ) : null}

              <p className="text-base font-semibold text-foreground">
                {plan.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {copy.tagline}
              </p>

              <div className="mt-4">
                {plan.introAmountCents ? (
                  <>
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      {formatBrlFromCents(plan.introAmountCents)}
                      <span className="text-sm font-medium text-muted-foreground">
                        /mês
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      nos primeiros {plan.introDurationDays} dias, depois{" "}
                      {formatBrlFromCents(plan.amountCents)}/mês
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {formatBrlFromCents(plan.amountCents)}
                    <span className="text-sm font-medium text-muted-foreground">
                      /mês
                    </span>
                  </p>
                )}
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {copy.features.map((feature, i) =>
                  feature.endsWith(":") ? (
                    <li
                      key={i}
                      className="pt-1 text-xs font-medium text-muted-foreground"
                    >
                      {feature}
                    </li>
                  ) : (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[var(--brand-gold)]"
                        aria-hidden
                      />
                      <span className="text-foreground/90">{feature}</span>
                    </li>
                  ),
                )}
              </ul>

              <p className="mt-4 text-[11px] text-muted-foreground">
                {plan.trialDays
                  ? `${plan.trialDays} dias grátis pra testar`
                  : plan.requiresSalesContact
                    ? "Onboarding com nosso time comercial"
                    : "Até " + plan.maxSeats + " logins"}
                {plan.trialDays ? ` · até ${plan.maxSeats} logins` : ""}
              </p>

              {canManage && !current ? (
                <Button
                  className="mt-4"
                  variant={plan.recommended ? "default" : "outline"}
                  disabled={pending}
                  onClick={() => onSelect(plan.slug)}
                >
                  {selected
                    ? "Selecionado ✓"
                    : plan.requiresSalesContact
                      ? "Falar com o time"
                      : "Escolher este plano"}
                </Button>
              ) : current ? (
                <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
                  Seu plano atual
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {message ? (
        <p className="text-xs text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
