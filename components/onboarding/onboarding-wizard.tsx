"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, LayoutDashboard } from "lucide-react";

import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { brandConfig } from "@/config/brand";
import {
  completeOnboardingAction,
  saveOnboardingStepAction,
} from "@/lib/onboarding/actions";
import {
  estimatedMinutesRemaining,
  getStepDefinition,
  isPremiumFlowStep,
  PREMIUM_ONBOARDING_FLOW,
  PREMIUM_STEP_COPY,
  segmentCopy,
} from "@/lib/onboarding";
import { humanizeOnboardingError } from "@/lib/onboarding/onboarding-validation";
import {
  gofColors,
  gofFocusRing,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  OnboardingSessionView,
  OnboardingStepId,
} from "@/lib/onboarding";

type Props = {
  tenantSlug: string;
  tenantName: string;
  segment: string | null;
  session: OnboardingSessionView;
};

function resolvePremiumStep(id: OnboardingStepId): OnboardingStepId {
  if (isPremiumFlowStep(id)) return id;
  if (id === "segment") return "company";
  if (
    id === "monthly_goal" ||
    id === "first_client" ||
    id === "first_product"
  ) {
    return "first_sale";
  }
  if (id === "review" || id === "dashboard") return "first_sale";
  return "welcome";
}

/**
 * Wizard premium — máx. 4 passos, sempre com Pular (Gate 19.4).
 * Persistência e IDs de step inalterados no motor.
 */
export function OnboardingWizard({
  tenantSlug,
  tenantName,
  segment,
  session,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>(
    resolvePremiumStep(session.nextStep),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = segmentCopy(segment);
  const def = getStepDefinition(step);
  const estimated = estimatedMinutesRemaining(session.checklist);
  const premiumCopy =
    PREMIUM_STEP_COPY[step as keyof typeof PREMIUM_STEP_COPY];
  const stepIndex = PREMIUM_ONBOARDING_FLOW.indexOf(
    step as (typeof PREMIUM_ONBOARDING_FLOW)[number],
  );
  const flowIndex = stepIndex >= 0 ? stepIndex : 0;

  function go(opts?: { skip?: boolean }) {
    setError(null);
    startTransition(async () => {
      try {
        // Marca o passo atual e avança o fluxo premium (máx. 4) na UI.
        await saveOnboardingStepAction({
          tenantSlug,
          step,
          skip: opts?.skip ?? true,
        });

        const nextPremium =
          flowIndex >= 0 && flowIndex < PREMIUM_ONBOARDING_FLOW.length - 1
            ? PREMIUM_ONBOARDING_FLOW[flowIndex + 1]
            : null;

        if (!nextPremium || step === "first_sale") {
          await completeOnboardingAction(tenantSlug);
          router.push(`/${tenantSlug}/dashboard`);
          return;
        }

        setStep(nextPremium);
        router.refresh();
      } catch (err) {
        setError(humanizeOnboardingError(err));
      }
    });
  }

  function skipAlways() {
    setError(null);
    startTransition(async () => {
      try {
        await saveOnboardingStepAction({ tenantSlug, step, skip: true });
        router.push(`/${tenantSlug}/dashboard`);
      } catch (err) {
        setError(humanizeOnboardingError(err));
      }
    });
  }

  function saveAndExit() {
    setError(null);
    startTransition(async () => {
      try {
        await saveOnboardingStepAction({ tenantSlug, step });
        router.push(`/${tenantSlug}/dashboard`);
      } catch (err) {
        setError(humanizeOnboardingError(err));
      }
    });
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-11", gofFocusRing)}
        disabled={pending || flowIndex === 0}
        onClick={() => {
          if (flowIndex > 0) {
            setStep(PREMIUM_ONBOARDING_FLOW[flowIndex - 1]!);
          }
        }}
      >
        <DsIcon icon={ArrowLeft} size="sm" className="text-current" />
        Voltar
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn("min-h-11", gofFocusRing)}
        disabled={pending}
        onClick={skipAlways}
      >
        Pular
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-11", gofFocusRing)}
        disabled={pending}
        onClick={saveAndExit}
      >
        Continuar depois
      </Button>
      {step === "first_sale" ? (
        <Button
          type="button"
          className={cn("min-h-11", gofFocusRing)}
          disabled={pending}
          onClick={() => go()}
        >
          Ir ao Dashboard
          <DsIcon icon={LayoutDashboard} size="sm" className="text-current" />
        </Button>
      ) : (
        <Button
          type="button"
          className={cn("min-h-11", gofFocusRing)}
          disabled={pending}
          onClick={() => go()}
        >
          {pending ? "Salvando…" : "Continuar"}
          <DsIcon icon={ArrowRight} size="sm" className="text-current" />
        </Button>
      )}
    </>
  );

  return (
    <OnboardingShell
      title={premiumCopy?.title ?? def?.title ?? "Primeiro acesso"}
      description={
        premiumCopy?.description ??
        (step === "welcome" ? copy.welcomeLead : def?.description)
      }
      footer={
        <>
          {footer}
          <Button
            type="button"
            variant="ghost"
            className={cn("min-h-11", gofFocusRing)}
            render={<Link href={`/${tenantSlug}/dashboard`} />}
          >
            Ir ao Dashboard agora
          </Button>
        </>
      }
    >
      <OnboardingTour
        tenantSlug={tenantSlug}
        dismissed={Boolean(session.progress?.tourDismissedAt)}
      />

      <p className={cn("mb-4", gofTypography.caption)}>
        Passo {flowIndex + 1} de {PREMIUM_ONBOARDING_FLOW.length} ·{" "}
        {brandConfig.name} {brandConfig.edition}
      </p>

      <div className="mb-6">
        <OnboardingProgress
          checklist={session.checklist}
          estimatedMinutes={estimated}
          message={session.message}
        />
      </div>

      {error ? (
        <p
          className={cn(
            "mb-4 border px-3 py-2 text-sm",
            gofRadius.lg,
            gofColors.danger.soft,
            gofColors.danger.border,
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {step === "welcome" ? (
        <OnboardingStep
          title="O que vem a seguir"
          description={copy.firstValueHint}
        >
          <ol className={cn("list-decimal space-y-2 pl-5", gofTypography.caption)}>
            <li>Bem-vindo ao Gestão.</li>
            <li>Cadastre sua empresa.</li>
            <li>Configure seu financeiro.</li>
            <li>Comece registrando sua primeira Ordem de Serviço.</li>
          </ol>
          <p className={cn("mt-3", gofTypography.caption)}>
            Você pode pular a qualquer momento — a plataforma nunca bloqueia o
            uso.
          </p>
        </OnboardingStep>
      ) : null}

      {step === "company" ? (
        <OnboardingStep
          title="Empresa"
          description="Esses dados já foram definidos na criação. Confirme e avance."
        >
          <p className={gofTypography.caption}>
            Empresa: <strong>{tenantName}</strong>
            {segment ? (
              <>
                {" "}
                · Segmento: <strong>{segment}</strong>
              </>
            ) : null}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 min-h-11"
            render={<Link href={`/${tenantSlug}/configuracoes`} />}
          >
            Abrir configurações
          </Button>
        </OnboardingStep>
      ) : null}

      {step === "bank_account" ? (
        <OnboardingStep
          title={def?.title ?? "Financeiro"}
          description={def?.description ?? ""}
          optional
        >
          <Button
            className="min-h-11"
            render={
              <Link
                href={`/${tenantSlug}/financeiro/contas-bancarias/novo`}
              />
            }
          >
            Cadastrar conta
          </Button>
          <p className={cn("mt-3", gofTypography.caption)}>
            Opcional agora — pule e configure depois.
          </p>
        </OnboardingStep>
      ) : null}

      {step === "first_sale" ? (
        <OnboardingStep
          title="Primeira Ordem de Serviço"
          description="Registre a primeira OS para ativar o painel com dados reais."
          optional
        >
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              render={<Link href={`/${tenantSlug}/ordens/nova`} />}
            >
              Criar primeira OS
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              render={<Link href={`/${tenantSlug}/vendas/nova`} />}
            >
              Registrar venda
            </Button>
          </div>
          <div className="mt-6">
            <OnboardingChecklist checklist={session.checklist} />
          </div>
        </OnboardingStep>
      ) : null}
    </OnboardingShell>
  );
}
