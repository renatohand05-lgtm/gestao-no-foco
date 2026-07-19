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
import {
  completeOnboardingAction,
  saveOnboardingStepAction,
} from "@/lib/onboarding/actions";
import {
  estimatedMinutesRemaining,
  getStepDefinition,
  orderedStepIds,
  personaCopy,
  segmentCopy,
  suggestedPresetForSegment,
} from "@/lib/onboarding";
import { humanizeOnboardingError } from "@/lib/onboarding/onboarding-validation";
import { exAnimations, exTypography } from "@/lib/design-system";
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

export function OnboardingWizard({
  tenantSlug,
  tenantName,
  segment,
  session,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>(session.nextStep);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = segmentCopy(segment);
  const persona = personaCopy(
    session.progress?.preferredPresetKey ??
      suggestedPresetForSegment(segment),
  );
  const def = getStepDefinition(step);
  const estimated = estimatedMinutesRemaining(session.checklist);
  const stepOrder = orderedStepIds();

  function go(next: OnboardingStepId, opts?: { skip?: boolean }) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveOnboardingStepAction({
          tenantSlug,
          step,
          skip: opts?.skip,
        });
        if (result.nextStep === "dashboard" || next === "dashboard") {
          await completeOnboardingAction(tenantSlug);
          router.push(`/${tenantSlug}/dashboard`);
          return;
        }
        setStep(result.nextStep);
        router.refresh();
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
        className={cn("min-h-11", exAnimations.focusRing)}
        disabled={pending || step === "welcome"}
        onClick={() => {
          const idx = stepOrder.indexOf(step);
          if (idx > 0) setStep(stepOrder[idx - 1]!);
        }}
      >
        <DsIcon icon={ArrowLeft} size="sm" className="text-current" />
        Voltar
      </Button>
      {def && !def.required ? (
        <Button
          type="button"
          variant="ghost"
          className={cn("min-h-11", exAnimations.focusRing)}
          disabled={pending}
          onClick={() => go(step, { skip: true })}
        >
          Pular
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-11", exAnimations.focusRing)}
        disabled={pending}
        onClick={saveAndExit}
      >
        Continuar depois
      </Button>
      {step === "review" || step === "dashboard" ? (
        <Button
          type="button"
          className={cn("min-h-11", exAnimations.focusRing)}
          disabled={pending}
          onClick={() => go("dashboard")}
        >
          Ir ao Dashboard
          <DsIcon icon={LayoutDashboard} size="sm" className="text-current" />
        </Button>
      ) : (
        <Button
          type="button"
          className={cn("min-h-11", exAnimations.focusRing)}
          disabled={pending}
          onClick={() => go(step)}
        >
          {pending ? "Salvando…" : "Continuar"}
          <DsIcon icon={ArrowRight} size="sm" className="text-current" />
        </Button>
      )}
    </>
  );

  return (
    <OnboardingShell
      title={
        step === "welcome"
          ? `Bem-vindo, ${tenantName}`
          : (def?.title ?? "Primeiro acesso")
      }
      description={
        step === "welcome"
          ? copy.welcomeLead
          : (def?.description ?? session.message)
      }
      footer={
        <>
          {footer}
          <Button
            type="button"
            variant="ghost"
            className={cn("min-h-11", exAnimations.focusRing)}
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

      <div className="mb-6">
        <OnboardingProgress
          checklist={session.checklist}
          estimatedMinutes={estimated}
          message={session.message}
        />
      </div>

      <p className={cn("mb-4", exTypography.caption)}>
        Foco sugerido ({persona.label}): {persona.focus}
      </p>

      {error ? (
        <p
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {step === "welcome" ? (
        <OnboardingStep
          title="O que você ativa agora"
          description={copy.firstValueHint}
        >
          <ul className={cn("list-disc space-y-1 pl-5", exTypography.caption)}>
            <li>Configure o essencial sem preencher dezenas de cadastros.</li>
            <li>Meta ou primeira venda liberam o Dashboard útil.</li>
            <li>Pule o opcional e retome quando quiser.</li>
          </ul>
        </OnboardingStep>
      ) : null}

      {step === "company" || step === "segment" ? (
        <OnboardingStep
          title={def?.title ?? "Empresa"}
          description="Esses dados já foram definidos na criação. Confirme e avance."
        >
          <p className={exTypography.caption}>
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

      {step === "bank_account" ||
      step === "monthly_goal" ||
      step === "first_client" ||
      step === "first_product" ||
      step === "first_sale" ? (
        <OnboardingStep
          title={def?.title ?? "Etapa"}
          description={def?.description ?? ""}
          optional={!def?.required}
        >
          {def?.hrefSuffix ? (
            <Button
              className="min-h-11"
              render={<Link href={`/${tenantSlug}${def.hrefSuffix}`} />}
            >
              {session.checklist.items.find((i) => i.id === def.checklistId)
                ?.ctaLabel ?? "Abrir cadastro"}
            </Button>
          ) : null}
          <p className={cn("mt-3", exTypography.caption)}>
            Você pode cadastrar agora ou pular e voltar depois. O status só
            marca concluído com dados reais.
          </p>
        </OnboardingStep>
      ) : null}

      {step === "review" || step === "dashboard" ? (
        <OnboardingStep
          title="Revisão"
          description="Checklist com validação real dos dados do tenant."
        >
          <OnboardingChecklist checklist={session.checklist} />
        </OnboardingStep>
      ) : null}
    </OnboardingShell>
  );
}
