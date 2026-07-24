"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { brandConfig } from "@/config/brand";
import { dismissOnboardingTourAction } from "@/lib/onboarding/actions";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

/** Tour opcional — máx. 2 linhas por passo (Gate 19.4). */
const TOUR_STEPS = [
  {
    title: "Dashboard",
    body: "Visão executiva do dia: meta, ritmo e prioridades.",
  },
  {
    title: "Financeiro",
    body: "Contas, fluxo e saúde financeira em um só lugar.",
  },
  {
    title: "Clientes",
    body: "CRM com histórico, agenda e relacionamento.",
  },
  {
    title: "Ordens de Serviço",
    body: "Abra, acompanhe e conclua OS com controle.",
  },
  {
    title: "Estoque",
    body: "Movimente peças e produtos com rastreio.",
  },
  {
    title: "Relatórios",
    body: "Leituras consolidadas para decidir com clareza.",
  },
  {
    title: "IA Executiva",
    body: "Score e alertas para acelerar decisões.",
  },
] as const;

type Props = {
  tenantSlug: string;
  dismissed?: boolean;
};

/**
 * Tour discreto — nunca bloqueia a tela (Gate 19.4).
 */
export function OnboardingTour({ tenantSlug, dismissed }: Props) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(Boolean(dismissed));
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  const step = TOUR_STEPS[index]!;
  const last = index === TOUR_STEPS.length - 1;

  function finish() {
    setHidden(true);
    startTransition(() => {
      void dismissOnboardingTourAction(tenantSlug);
    });
  }

  return (
    <div
      className={cn(
        "mb-5 border border-border/60 bg-[var(--brand-white)] p-4",
        gofRadius.lg,
        gofMotion.fade,
      )}
      role="region"
      aria-label="Tour opcional da plataforma"
      aria-live="polite"
    >
      <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
        Tour · {brandConfig.name} · {index + 1}/{TOUR_STEPS.length}
      </p>
      <p className={cn("mt-2", gofTypography.title)}>{step.title}</p>
      <p className={cn("mt-1 max-w-xl", gofTypography.subtitle)}>{step.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!last ? (
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={pending}
            onClick={() => setIndex((v) => v + 1)}
          >
            Próximo
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={pending}
            onClick={finish}
          >
            Concluir
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11"
          disabled={pending}
          onClick={finish}
        >
          Ignorar
        </Button>
      </div>
    </div>
  );
}
