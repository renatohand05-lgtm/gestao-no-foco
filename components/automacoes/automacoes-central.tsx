"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Shield,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createAutomationFromTemplateAction,
  decideAutomationApprovalAction,
  dryRunAutomationAction,
  dryRunMandatoryScenariosAction,
  duplicateAutomationRuleAction,
  markAutomationNotificationReadAction,
  setAutomationRuleStatusAction,
  cleanupQa3071Action,
} from "@/lib/automacoes/actions";
import type { AutomationCentralSnapshot } from "@/lib/automacoes/types";
import type { AutomationTemplate } from "@/lib/automacoes/templates";
import type { TriggerDefinition } from "@/lib/automacoes/triggers";
import type { ActionDefinition } from "@/lib/automacoes/actions-catalog";
import { cn } from "@/lib/utils";
import { gofTypography } from "@/lib/design-system";

type Props = {
  tenantSlug: string;
  initialSnapshot: AutomationCentralSnapshot;
  templates: AutomationTemplate[];
  triggers: readonly TriggerDefinition[];
  allowedActions: readonly ActionDefinition[];
  blockedActions: readonly string[];
  probeMessage: string;
  segmentTitle: string;
  segmentHighlights: string[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovada",
  active: "Ativa",
  paused: "Pausada",
  disabled: "Desativada",
  failed: "Falhou",
  archived: "Arquivada",
};

export function AutomacoesCentral({
  tenantSlug,
  initialSnapshot,
  templates,
  triggers,
  allowedActions,
  blockedActions,
  probeMessage,
  segmentTitle,
  segmentHighlights,
}: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [view, setView] = useState<
    "lista" | "cards" | "historico" | "aprovacoes" | "builder" | "templates"
  >("lista");
  const [builderStep, setBuilderStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dryResult, setDryResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rules = snapshot.rules;

  const healthTone = useMemo(() => {
    if (snapshot.health === "critico") return "text-red-700 dark:text-red-400";
    if (snapshot.health === "atencao") return "text-amber-700 dark:text-amber-400";
    return "text-emerald-700 dark:text-emerald-400";
  }, [snapshot.health]);

  function run(action: () => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Erro inesperado");
      }
    });
  }

  return (
    <div
      className="space-y-4"
      data-automacoes-central=""
      data-sprint="30.7"
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={cn(gofTypography.title, "text-foreground")}>
              {segmentTitle}
            </h1>
            <p className={cn(gofTypography.subtitle, "text-muted-foreground")}>
              Fluxos internos com aprovação, dry-run e auditoria — sem ações
              externas automáticas.
            </p>
          </div>
          <Badge variant="outline" data-automacoes-health="">
            Saúde: {snapshot.health}
          </Badge>
        </div>
        <p className={cn("text-sm", healthTone)}>{snapshot.healthReason}</p>
        {!snapshot.schemaReady ? (
          <div
            role="status"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
            data-automacoes-schema-pending=""
          >
            {probeMessage}
          </div>
        ) : (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm"
            data-automacoes-schema-ready=""
          >
            Schema de Automações ativo · persistência habilitada
          </div>
        )}
      </header>

      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        data-automacoes-kpis=""
      >
        <Kpi title="Regras ativas" value={String(snapshot.activeRules)} />
        <Kpi title="Pausadas" value={String(snapshot.pausedRules)} />
        <Kpi
          title="Aguardando aprovação"
          value={String(snapshot.waitingApproval.length)}
        />
        <Kpi
          title="Economia de tempo"
          value={
            snapshot.timeSavedMinutes == null
              ? "Sem base real"
              : `${snapshot.timeSavedMinutes} min`
          }
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Visões">
        {(
          [
            ["lista", "Lista"],
            ["cards", "Cards"],
            ["historico", "Histórico"],
            ["aprovacoes", "Aprovações"],
            ["templates", "Templates"],
            ["builder", "Builder"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={view === id ? "default" : "outline"}
            onClick={() => setView(id)}
            aria-selected={view === id}
            role="tab"
          >
            {label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await dryRunMandatoryScenariosAction(tenantSlug);
              if (!res.success) {
                setMessage(res.error);
                return;
              }
              setDryResult(
                res.results
                  .map(
                    (r) =>
                      `${r.trigger}: ${r.matched ? "matched" : "skip"} · dry-run`,
                  )
                  .join("\n"),
              );
              setMessage(
                `Dry-run obrigatório: ${res.results.length} cenários · 0 efeito externo · schema=${res.schemaReady ? "ok" : "pendente"}`,
              );
            })
          }
        >
          Dry-run cenários
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await cleanupQa3071Action(tenantSlug);
              if (!res.success) {
                setMessage(res.error);
                return;
              }
              setMessage(`Limpeza QA3071: ${res.deleted} regra(s)`);
            })
          }
        >
          Limpar QA3071
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {dryResult ? (
        <pre
          className="overflow-auto rounded-lg border bg-muted/40 p-3 text-xs"
          data-automacoes-dry-run=""
        >
          {dryResult}
        </pre>
      ) : null}

      {view === "lista" || view === "cards" ? (
        <section className="space-y-3" data-automacoes-rules="">
          <h2 className="text-base font-semibold">Regras</h2>
          <div
            className={cn(
              view === "cards"
                ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                : "space-y-2",
            )}
          >
            {rules.map((rule) => (
              <Card key={rule.id} className="shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <Badge variant="outline">
                      {STATUS_LABEL[rule.status] ?? rule.status}
                    </Badge>
                  </div>
                  <CardDescription>{rule.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    Módulo: {rule.module} · Gatilho: {rule.triggerType}
                  </p>
                  <p>
                    Aprovação: {rule.requiresApproval ? "sim" : "não"} ·
                    Cooldown: {rule.cooldownSeconds}s
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await dryRunAutomationAction(
                            tenantSlug,
                            rule.id,
                          );
                          if (!res.success) {
                            setMessage(res.error);
                            return;
                          }
                          setDryResult(
                            JSON.stringify(res.dryRun, null, 2),
                          );
                          setMessage(
                            `Simulação ${res.dryRun.matched ? "com match" : "sem match"} · ação final não persistida`,
                          );
                        })
                      }
                    >
                      Simular
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await setAutomationRuleStatusAction(
                            tenantSlug,
                            rule.id,
                            "active",
                          );
                          if (!res.success) {
                            setMessage(res.error);
                            return;
                          }
                          setSnapshot((s) => ({
                            ...s,
                            rules: s.rules.map((r) =>
                              r.id === rule.id ? res.rule : r,
                            ),
                            activeRules: s.rules.filter(
                              (r) =>
                                (r.id === rule.id ? "active" : r.status) ===
                                "active",
                            ).length,
                          }));
                          setMessage("Regra ativada (execução ainda exige aprovação quando sensível).");
                        })
                      }
                    >
                      <PlayCircle className="mr-1 size-3.5" />
                      Ativar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await setAutomationRuleStatusAction(
                            tenantSlug,
                            rule.id,
                            "paused",
                          );
                          if (!res.success) {
                            setMessage(res.error);
                            return;
                          }
                          setSnapshot((s) => ({
                            ...s,
                            rules: s.rules.map((r) =>
                              r.id === rule.id ? res.rule : r,
                            ),
                          }));
                          setMessage("Regra pausada.");
                        })
                      }
                    >
                      <PauseCircle className="mr-1 size-3.5" />
                      Pausar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await duplicateAutomationRuleAction(
                            tenantSlug,
                            rule.id,
                          );
                          if (!res.success) {
                            setMessage(res.error);
                            return;
                          }
                          setSnapshot((s) => ({
                            ...s,
                            rules: [res.rule, ...s.rules],
                          }));
                          setMessage("Regra duplicada como rascunho.");
                        })
                      }
                    >
                      Duplicar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {view === "historico" ? (
        <section className="space-y-3" data-automacoes-history="">
          <h2 className="text-base font-semibold">Execuções recentes</h2>
          <ul className="space-y-2">
            {snapshot.recentExecutions.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Nenhuma execução ainda. Use Simular ou Dry-run cenários.
              </li>
            ) : (
              snapshot.recentExecutions.map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{ex.triggerType}</span>
                    <Badge variant="outline">{ex.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {ex.dryRun ? "Dry-run · " : ""}
                    correlation {ex.correlationId}
                  </p>
                  {ex.errorMessage ? (
                    <p className="text-destructive">{ex.errorMessage}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          <h3 className="pt-2 text-sm font-semibold">Auditoria</h3>
          <ul className="max-h-64 space-y-1 overflow-auto text-xs">
            {snapshot.audit.map((a) => (
              <li key={a.id} className="rounded border px-2 py-1">
                {a.createdAt} · {a.event} · {a.result}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view === "aprovacoes" ? (
        <section className="space-y-3" data-automacoes-approvals="">
          <h2 className="text-base font-semibold">Aprovações</h2>
          {snapshot.waitingApproval.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma aprovação pendente.
            </p>
          ) : (
            snapshot.waitingApproval.map((ap) => (
              <Card key={ap.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <div className="text-sm">
                    <p className="font-medium">Pedido {ap.id}</p>
                    <p className="text-muted-foreground">
                      Solicitado por usuário · expira {ap.expiresAt ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await decideAutomationApprovalAction(
                            tenantSlug,
                            ap.id,
                            "approved",
                            "Aprovado na Central",
                          );
                          if (!res.success) {
                            setMessage(res.error);
                            return;
                          }
                          setMessage("Aprovação registrada.");
                        })
                      }
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await decideAutomationApprovalAction(
                            tenantSlug,
                            ap.id,
                            "rejected",
                            "Reprovado na Central",
                          );
                          if (!res.success) {
                            setMessage(res.error);
                            return;
                          }
                          setMessage("Reprovação registrada.");
                        })
                      }
                    >
                      Reprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      ) : null}

      {view === "templates" ? (
        <section className="space-y-3" data-automacoes-templates="">
          <h2 className="text-base font-semibold">Templates (desativados por padrão)</h2>
          <ul className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {segmentHighlights.map((h) => (
              <li key={h} className="rounded-full border px-2 py-0.5">
                {h}
              </li>
            ))}
          </ul>
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  <CardDescription>{tpl.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const res = await createAutomationFromTemplateAction(
                          tenantSlug,
                          tpl.id,
                        );
                        if (!res.success) {
                          setMessage(res.error);
                          return;
                        }
                        setSnapshot((s) => ({
                          ...s,
                          rules: [res.rule, ...s.rules],
                        }));
                        setMessage("Template aplicado como rascunho.");
                        setView("lista");
                      })
                    }
                  >
                    Usar template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {view === "builder" ? (
        <section
          className="space-y-4 rounded-xl border p-4"
          data-automacoes-builder=""
          aria-label="Builder de automação"
        >
          <h2 className="text-base font-semibold">Builder · etapa {builderStep} de 8</h2>
          <ol className="flex flex-wrap gap-2 text-xs" aria-label="Stepper">
            {[
              "Nome",
              "Módulo",
              "Gatilho",
              "Condições",
              "Ações",
              "Aprovação",
              "Simular",
              "Revisar",
            ].map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    builderStep === i + 1 && "bg-primary text-primary-foreground",
                  )}
                  aria-current={builderStep === i + 1 ? "step" : undefined}
                  onClick={() => setBuilderStep(i + 1)}
                >
                  {i + 1}. {label}
                </button>
              </li>
            ))}
          </ol>

          {builderStep === 1 ? (
            <p className="text-sm">
              Defina o objetivo em linguagem simples. Ex.: “Avisar quando a OS
              atrasar”.
            </p>
          ) : null}
          {builderStep === 2 ? (
            <p className="text-sm">
              Módulos: financeiro, CRM, operação, estoque, compras, metas,
              inteligência, tributário.
            </p>
          ) : null}
          {builderStep === 3 ? (
            <ul className="max-h-48 space-y-1 overflow-auto text-sm">
              {triggers.slice(0, 12).map((t) => (
                <li key={t.type}>
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => setSelectedTemplate(t.type)}
                  >
                    {t.label}{" "}
                    <span className="text-muted-foreground">
                      · {t.dataSource}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {builderStep === 4 ? (
            <p className="text-sm">
              Condições: igual, maior/menor, contém, período, mudou de/para,
              AND/OR — validadas contra campos do gatilho.
            </p>
          ) : null}
          {builderStep === 5 ? (
            <div className="space-y-2 text-sm">
              <p>Ações internas permitidas:</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {allowedActions.map((a) => (
                  <li key={a.type} className="rounded border px-2 py-1">
                    {a.label}
                    {a.sensitive ? " · sensível" : ""}
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Bloqueadas sem integração: {blockedActions.join(", ")}
              </p>
            </div>
          ) : null}
          {builderStep === 6 ? (
            <p className="text-sm">
              Ações sensíveis exigem aprovação server-side. Autoaprovação
              bloqueada por padrão.
            </p>
          ) : null}
          {builderStep === 7 ? (
            <p className="text-sm">
              Simule com dry-run antes de ativar. Nada de efeito externo ou
              financeiro é persistido.
              {selectedTemplate ? ` Gatilho selecionado: ${selectedTemplate}` : ""}
            </p>
          ) : null}
          {builderStep === 8 ? (
            <div className="space-y-2 text-sm">
              <p>Revise e salve como rascunho a partir de um template.</p>
              <Button
                disabled={pending || !templates[0]}
                onClick={() =>
                  run(async () => {
                    const res = await createAutomationFromTemplateAction(
                      tenantSlug,
                      templates[0]!.id,
                    );
                    if (!res.success) {
                      setMessage(res.error);
                      return;
                    }
                    setSnapshot((s) => ({
                      ...s,
                      rules: [res.rule, ...s.rules],
                    }));
                    setMessage("Rascunho criado. Ative só após simular.");
                    setView("lista");
                  })
                }
              >
                Salvar rascunho
              </Button>
            </div>
          ) : null}

          <div className="sticky bottom-0 flex gap-2 border-t bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <Button
              size="sm"
              variant="outline"
              disabled={builderStep <= 1}
              onClick={() => setBuilderStep((s) => Math.max(1, s - 1))}
            >
              Voltar
            </Button>
            <Button
              size="sm"
              disabled={builderStep >= 8}
              onClick={() => setBuilderStep((s) => Math.min(8, s + 1))}
            >
              Continuar
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-2" data-automacoes-notifications="">
        <h2 className="text-base font-semibold">Notificações internas</h2>
        {snapshot.notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
        ) : (
          <ul className="space-y-2">
            {snapshot.notifications.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted-foreground">{n.body}</p>
                </div>
                {!n.readAt ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(async () => {
                        await markAutomationNotificationReadAction(
                          tenantSlug,
                          n.id,
                        );
                        setSnapshot((s) => ({
                          ...s,
                          notifications: s.notifications.map((x) =>
                            x.id === n.id
                              ? { ...x, readAt: new Date().toISOString() }
                              : x,
                          ),
                        }));
                      })
                    }
                  >
                    Marcar lida
                  </Button>
                ) : (
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Shield className="size-3.5" /> Tenant isolation · RBAC server-side
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-3.5" /> Sem IA generativa · sem canal externo
        </span>
        <Link
          href={`/${tenantSlug}/aprovacoes/runtime`}
          className="underline-offset-2 hover:underline"
        >
          Runtime de aprovações
        </Link>
      </footer>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
