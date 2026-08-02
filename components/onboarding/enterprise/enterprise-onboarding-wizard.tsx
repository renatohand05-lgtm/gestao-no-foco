"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Package,
  Upload,
  Users,
  Wrench,
} from "lucide-react";

import { CompanyForm } from "@/components/onboarding/enterprise/company-form";
import { EnterpriseProgress } from "@/components/onboarding/enterprise/enterprise-progress";
import { SegmentPicker } from "@/components/onboarding/enterprise/segment-picker";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { brandConfig } from "@/config/brand";
import {
  ENTERPRISE_AVG_MINUTES,
  ENTERPRISE_ONBOARDING_FLOW,
  nextEnterpriseStep,
  prevEnterpriseStep,
  type EnterpriseOnboardingStepId,
} from "@/config/onboarding/flow";
import { mergeCompanyProfile, type CompanyProfile } from "@/config/onboarding/company-fields";
import { getEnterpriseSegment, type EnterpriseSegmentId } from "@/config/onboarding/segments";
import { getSegmentSetup } from "@/config/onboarding/segment-setup";
import { getSegmentTemplatePack } from "@/config/onboarding/templates";
import {
  IMPLANTATION_CHECKLIST,
  implantationProgressPct,
  type ImplantationItemId,
} from "@/config/onboarding/implantation-checklist";
import { IMPORT_CHANNELS, type ImportChannelId } from "@/config/onboarding/import-channels";
import { saveEnterpriseOnboardingAction } from "@/lib/onboarding/enterprise/actions";
import type { EnterpriseSessionView } from "@/lib/onboarding/enterprise/types";
import {
  gofColors,
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  session: EnterpriseSessionView;
};

const STORAGE_PREFIX = "gof-enterprise-onboarding:";

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

export function EnterpriseOnboardingWizard({ tenantSlug, session }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<EnterpriseOnboardingStepId>(
    session.meta.step || "welcome",
  );
  const [segmentId, setSegmentId] = useState<EnterpriseSegmentId | null>(
    session.meta.segmentId,
  );
  const [company, setCompany] = useState<CompanyProfile>(
    mergeCompanyProfile(session.meta.company),
  );
  const [templatesAck, setTemplatesAck] = useState(
    session.meta.templatesAcknowledged,
  );
  const [checklistMarked, setChecklistMarked] = useState<ImplantationItemId[]>(
    session.meta.checklistMarked.length
      ? session.meta.checklistMarked
      : (["empresa_criada"] as ImplantationItemId[]),
  );
  const [importInterest, setImportInterest] = useState<ImportChannelId[]>(
    session.meta.importChannelsInterest,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveGen = useRef(0);

  const def =
    ENTERPRISE_ONBOARDING_FLOW.find((s) => s.id === step) ??
    ENTERPRISE_ONBOARDING_FLOW[0]!;
  const setup = getSegmentSetup(segmentId);
  const templates = getSegmentTemplatePack(segmentId);
  const segmentDef = getEnterpriseSegment(segmentId);
  const checklistPct = implantationProgressPct(checklistMarked);

  // Local draft — sair e voltar (hydrate em microtask para evitar setState síncrono no effect)
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(storageKey(tenantSlug));
        if (raw) {
          const draft = JSON.parse(raw) as {
            step?: EnterpriseOnboardingStepId;
            segmentId?: EnterpriseSegmentId | null;
            company?: CompanyProfile;
            templatesAck?: boolean;
            checklistMarked?: ImplantationItemId[];
            importInterest?: ImportChannelId[];
          };
          if (draft.step) setStep(draft.step);
          if (draft.segmentId !== undefined) setSegmentId(draft.segmentId);
          if (draft.company) setCompany(mergeCompanyProfile(draft.company));
          if (typeof draft.templatesAck === "boolean") {
            setTemplatesAck(draft.templatesAck);
          }
          if (draft.checklistMarked) setChecklistMarked(draft.checklistMarked);
          if (draft.importInterest) setImportInterest(draft.importInterest);
        }
      } catch {
        /* ignore corrupt draft */
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  useEffect(() => {
    if (!hydrated) return;

    const draft = {
      step,
      segmentId,
      company,
      templatesAck,
      checklistMarked,
      importInterest,
    };
    try {
      localStorage.setItem(storageKey(tenantSlug), JSON.stringify(draft));
    } catch {
      /* quota */
    }

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const gen = ++autosaveGen.current;
    autosaveTimer.current = setTimeout(() => {
      // Autosave silencioso — não usa startTransition/pending (não bloqueia Continuar)
      void saveEnterpriseOnboardingAction({
        tenantSlug,
        step,
        segmentId,
        company,
        templatesAcknowledged: templatesAck,
        checklistMarked,
        importChannelsInterest: importInterest,
      })
        .then(() => {
          if (gen !== autosaveGen.current) return;
          setSavedHint(true);
          setTimeout(() => setSavedHint(false), 1600);
        })
        .catch(() => {
          /* silent autosave */
        });
    }, 900);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveGen.current += 1;
    };
  }, [
    hydrated,
    tenantSlug,
    step,
    segmentId,
    company,
    templatesAck,
    checklistMarked,
    importInterest,
  ]);

  function persist(opts?: {
    nextStep?: EnterpriseOnboardingStepId;
    complete?: boolean;
  }) {
    setError(null);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveGen.current += 1;
    startTransition(async () => {
      try {
        const target = opts?.nextStep ?? step;
        // Avança UI imediatamente — persistência em seguida
        if (opts?.nextStep) setStep(opts.nextStep);
        await saveEnterpriseOnboardingAction({
          tenantSlug,
          step: target,
          segmentId,
          company,
          templatesAcknowledged: templatesAck,
          checklistMarked,
          importChannelsInterest: importInterest,
          complete: opts?.complete,
        });
        if (opts?.complete) {
          try {
            localStorage.removeItem(storageKey(tenantSlug));
          } catch {
            /* ignore */
          }
          router.push(`/${tenantSlug}/dashboard`);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
    });
  }

  function goNext() {
    if (step === "segment" && !segmentId) {
      setError("Escolha um segmento para continuar.");
      return;
    }
    if (step === "templates" && !templatesAck) {
      setTemplatesAck(true);
    }
    const next = nextEnterpriseStep(step);
    if (!next) {
      persist({ complete: true });
      return;
    }
    persist({ nextStep: next });
  }

  function goBack() {
    const prev = prevEnterpriseStep(step);
    if (prev) setStep(prev);
  }

  function toggleChecklist(id: ImplantationItemId) {
    setChecklistMarked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleImport(id: ImportChannelId) {
    setImportInterest((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-11", gofFocusRing)}
        disabled={pending || step === "welcome"}
        onClick={goBack}
      >
        <DsIcon icon={ArrowLeft} size="sm" className="text-current" />
        Voltar
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-11", gofFocusRing)}
        disabled={pending}
        onClick={() => persist()}
      >
        {pending ? "Salvando…" : "Salvar e sair"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn("min-h-11", gofFocusRing)}
        disabled={pending}
        render={<Link href={`/${tenantSlug}/dashboard`} />}
      >
        Sair
      </Button>
      {step === "complete" ? (
        <Button
          type="button"
          className={cn("min-h-11", gofFocusRing)}
          disabled={pending}
          onClick={() => persist({ complete: true })}
        >
          Ir ao Dashboard
          <DsIcon icon={LayoutDashboard} size="sm" className="text-current" />
        </Button>
      ) : (
        <Button
          type="button"
          className={cn("min-h-11", gofFocusRing)}
          disabled={pending}
          onClick={goNext}
        >
          {pending ? "Salvando…" : "Continuar"}
          <DsIcon icon={ArrowRight} size="sm" className="text-current" />
        </Button>
      )}
    </>
  );

  return (
    <OnboardingShell
      title={def.title}
      description={def.description}
      footer={footer}
      className="max-w-4xl"
    >
      <div className="mb-6 space-y-2">
        <EnterpriseProgress step={step} />
        <p className={gofTypography.caption}>
          {brandConfig.name} · tempo médio ~{ENTERPRISE_AVG_MINUTES} min
          {savedHint ? " · salvo automaticamente" : null}
        </p>
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
        <section className={cn("space-y-3", gofMotion.fade)} aria-labelledby="welcome-title">
          <h2 id="welcome-title" className={gofTypography.title}>
            Bem-vindo
          </h2>
          <p className={gofTypography.subtitle}>
            Vamos configurar sua empresa em poucos minutos.
          </p>
          <ul className={cn("list-disc space-y-1 pl-5", gofTypography.caption)}>
            <li>Escolher o segmento</li>
            <li>Dados da empresa (opcionais)</li>
            <li>Templates e checklist de implantação</li>
            <li>Próximos passos com assistente executivo</li>
          </ul>
          <p className={gofTypography.caption}>
            Você pode sair e voltar — o progresso é salvo automaticamente.
          </p>
        </section>
      ) : null}

      {step === "segment" ? (
        <SegmentPicker value={segmentId} onChange={setSegmentId} />
      ) : null}

      {step === "company" ? (
        <CompanyForm value={company} onChange={setCompany} />
      ) : null}

      {step === "segment_setup" ? (
        <section className={cn("space-y-4", gofMotion.fade)} aria-label="Configuração do segmento">
          <p className={gofTypography.caption}>
            Segmento: <strong>{segmentDef.label}</strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupBlock title="Labels" items={Object.values(setup.labels)} />
            <SetupBlock title="Menus" items={setup.menus} />
            <SetupBlock title="Módulos" items={setup.modules.map((m) => m.label)} />
            <SetupBlock title="Cadastros" items={setup.cadastros} />
            <SetupBlock title="Fluxos" items={setup.fluxos} />
            <SetupBlock title="KPIs" items={setup.kpis} />
            <SetupBlock title="Dashboards" items={setup.dashboards} />
            <SetupBlock title="Campos" items={setup.campos} />
          </div>
        </section>
      ) : null}

      {step === "templates" ? (
        <section className={cn("space-y-4", gofMotion.fade)} aria-label="Templates">
          <div>
            <h2 className={gofTypography.title}>{templates.title}</h2>
            <p className={cn(gofTypography.subtitle, "mt-1")}>
              {templates.description}
            </p>
            <p className={cn("mt-2", gofTypography.caption)}>
              Somente templates — nenhum dado real será inserido.
            </p>
          </div>
          <ul className="space-y-2">
            {templates.items.map((item) => (
              <li
                key={item.category}
                className={cn("border border-border/60 px-3 py-2", gofRadius.lg)}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className={gofTypography.caption}>
                  Exemplos: {item.examples.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={templatesAck}
              onChange={(e) => setTemplatesAck(e.target.checked)}
              className={gofFocusRing}
            />
            Entendi — aplicar estrutura de template (sem dados reais)
          </label>
        </section>
      ) : null}

      {step === "checklist" ? (
        <section className={cn("space-y-4", gofMotion.fade)} aria-label="Checklist de implantação">
          <p className={gofTypography.subtitle}>
            Progresso: {checklistPct}% ({checklistMarked.length} de{" "}
            {IMPLANTATION_CHECKLIST.length})
          </p>
          <div
            className={cn("h-1.5 overflow-hidden bg-muted", gofRadius.sm)}
            role="progressbar"
            aria-valuenow={checklistPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do checklist"
          >
            <div
              className="h-full bg-[var(--brand-gold)] motion-safe:transition-[width]"
              style={{ width: `${checklistPct}%` }}
            />
          </div>
          <ul className="space-y-2">
            {IMPLANTATION_CHECKLIST.map((item) => {
              const done = checklistMarked.includes(item.id);
              return (
                <li key={item.id}>
                  <label
                    className={cn(
                      "flex min-h-11 cursor-pointer items-start gap-3 border px-3 py-2",
                      gofRadius.lg,
                      done ? "border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/5" : "border-border/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleChecklist(item.id)}
                      className={cn("mt-1", gofFocusRing)}
                    />
                    <span>
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className={gofTypography.caption}>{item.description}</span>
                      <Link
                        href={`/${tenantSlug}${item.hrefSuffix}`}
                        className="mt-1 inline-block text-xs font-medium text-[var(--brand-gold)] underline"
                      >
                        Abrir
                      </Link>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {step === "import_prep" ? (
        <section className={cn("space-y-4", gofMotion.fade)} aria-label="Importação">
          <p className={gofTypography.subtitle}>
            Área preparada para importação futura. Nenhuma integração ativa nesta sprint.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {IMPORT_CHANNELS.map((ch) => {
              const selected = importInterest.includes(ch.id);
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => toggleImport(ch.id)}
                    className={cn(
                      "flex w-full min-h-11 flex-col items-start gap-1 border px-3 py-3 text-left",
                      gofRadius.lg,
                      gofFocusRing,
                      selected
                        ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10"
                        : "border-border/60",
                    )}
                    aria-pressed={selected}
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <DsIcon icon={Upload} size="sm" />
                      {ch.label}
                    </span>
                    <span className={gofTypography.caption}>{ch.description}</span>
                    <span className={gofTypography.caption}>
                      Status: {ch.status === "planned" ? "Planejado" : "Arquitetura pronta"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {step === "complete" ? (
        <section className={cn("space-y-5", gofMotion.fade)} aria-labelledby="complete-title">
          <div className="flex items-start gap-3">
            <DsIcon icon={CheckCircle2} size="lg" className="text-[var(--brand-gold)]" />
            <div>
              <h2 id="complete-title" className={gofTypography.title}>
                Parabéns!
              </h2>
              <p className={cn(gofTypography.subtitle, "mt-1")}>
                Sua empresa está pronta.
              </p>
              <p className={cn("mt-2", gofTypography.caption)}>
                Segmento {segmentDef.label} · checklist {checklistPct}%
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium">Próximos passos</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <QuickLink
                href={`/${tenantSlug}/produtos`}
                icon={Package}
                label="Cadastrar produtos"
              />
              <QuickLink
                href={`/${tenantSlug}/produtos/servicos`}
                icon={Wrench}
                label="Cadastrar serviços"
              />
              <QuickLink
                href={`/${tenantSlug}/configuracoes/equipe`}
                icon={Users}
                label="Criar equipe"
              />
              <QuickLink
                href={`/${tenantSlug}/dashboard`}
                icon={LayoutDashboard}
                label="Ver Dashboard"
              />
              <QuickLink
                href={`/${tenantSlug}/produtos?tab=importacao`}
                icon={Upload}
                label="Importar dados"
              />
            </div>
          </div>
        </section>
      ) : null}
    </OnboardingShell>
  );
}

function SetupBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={cn("border border-border/60 px-3 py-2", gofRadius.lg)}>
      <p className="text-xs font-medium tracking-wide text-[var(--brand-gold)] uppercase">
        {title}
      </p>
      <ul className={cn("mt-1 list-disc pl-4", gofTypography.caption)}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      className={cn("min-h-11", gofFocusRing)}
      render={<Link href={href} />}
    >
      <DsIcon icon={icon} size="sm" className="text-current" />
      {label}
    </Button>
  );
}
