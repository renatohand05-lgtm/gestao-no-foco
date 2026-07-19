"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { dismissOnboardingTourAction } from "@/lib/onboarding/actions";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const TOUR_STEPS = [
  {
    title: "Configure o essencial",
    body: "Empresa e segmento já liberam a base. O resto pode ser feito aos poucos.",
  },
  {
    title: "Meta ou venda = primeiro valor",
    body: "Com uma meta ou uma venda o Dashboard deixa de ficar vazio.",
  },
  {
    title: "Você pode sair e voltar",
    body: "O progresso é retomado. Pule o que for opcional.",
  },
  {
    title: "Checklist orienta",
    body: "Cada item mostra por quê importa e para onde ir.",
  },
  {
    title: "Dashboard acessível",
    body: "Você já pode abrir o Dashboard a qualquer momento.",
  },
] as const;

type Props = {
  tenantSlug: string;
  dismissed?: boolean;
};

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
        "mb-5 rounded-2xl border border-blue-500/20 bg-blue-50/60 p-4 dark:bg-blue-500/10",
        exAnimations.fade,
      )}
      role="dialog"
      aria-label="Tour rápido"
    >
      <p className={exTypography.label}>
        Tour rápido · {index + 1}/{TOUR_STEPS.length}
      </p>
      <p className={cn("mt-2", exTypography.sectionTitle)}>{step.title}</p>
      <p className={cn("mt-1", exTypography.caption)}>{step.body}</p>
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
            Entendi
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
          Fechar tour
        </Button>
      </div>
    </div>
  );
}
