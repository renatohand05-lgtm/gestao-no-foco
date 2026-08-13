"use client";

import { useState, useTransition } from "react";

import { requestPlanChangeAction } from "@/lib/billing/actions";
import {
  formatBrlFromCents,
  listCommercialPlans,
} from "@/lib/billing/catalog";
import { Button } from "@/components/ui/button";

type Props = {
  tenantSlug: string;
  canManage: boolean;
  currentPlanSlug: string | null;
};

export function BillingCatalogPanel({
  tenantSlug,
  canManage,
  currentPlanSlug,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plans = listCommercialPlans();

  function onSelect(slug: string) {
    setMessage(null);
    setError(null);
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
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Planos disponíveis
      </p>
      <p className="text-[11px] text-muted-foreground">
        Preços comerciais server-side. R$ 19,90 de homologação sandbox não é
        preço comercial. Nenhuma cobrança real nesta tela.
      </p>
      <div className="grid gap-2">
        {plans.map((plan) => {
          const current = currentPlanSlug === plan.slug;
          return (
            <div
              key={plan.slug}
              className="rounded-md border border-border/70 px-3 py-2 text-sm"
              data-plan-slug={plan.slug}
              data-recommended={plan.recommended ? "true" : "false"}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {plan.name}
                  {plan.recommended ? (
                    <span className="ml-2 text-[10px] uppercase text-primary">
                      Recomendado
                    </span>
                  ) : null}
                  {current ? (
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      Plano atual
                    </span>
                  ) : null}
                </p>
                <p className="text-xs">
                  {formatBrlFromCents(plan.amountCents)}/mês
                </p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {plan.description}
              </p>
              {plan.trialDays ? (
                <p className="text-[11px] text-muted-foreground">
                  Trial comercial padrão: {plan.trialDays} dias (não inicia
                  sozinho neste tenant).
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Sem trial automático — contato/onboarding comercial.
                </p>
              )}
              {canManage && !current ? (
                <Button
                  className="mt-2"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => onSelect(plan.slug)}
                >
                  Solicitar troca
                </Button>
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
