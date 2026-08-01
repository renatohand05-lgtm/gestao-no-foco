"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createTaxRuleDraftAction,
  createTaxRuleVersionAction,
  transitionTaxRuleAction,
  updateTaxRuleDraftAction,
} from "@/lib/tax/actions";
import type { TaxRule, TaxRuleStatus } from "@/lib/tax/types";
import {
  GFTaxRuleEditor,
  GFTaxRuleVersionDiff,
  GFTaxSourceReference,
  GFTaxWorkflowActions,
  GFTaxWorkflowStatus,
} from "@/components/gf/gf-tax-admin";
import { gfType } from "@/lib/design-system/signature";
import { GFButton } from "@/components/gf/gf-button";

export function TaxRuleCreateForm({
  tenantId,
  tenantSlug,
  userId,
}: {
  tenantId: string;
  tenantSlug: string;
  userId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      data-tax-rule-create-form=""
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            const res = await createTaxRuleDraftAction({
              tenantId,
              userId,
              code: String(fd.get("code") || "").trim(),
              name: String(fd.get("name") || "").trim(),
              sourceReference: String(fd.get("sourceReference") || "").trim(),
              validFrom: String(fd.get("validFrom") || ""),
              validTo: String(fd.get("validTo") || "") || null,
              priority: Number(fd.get("priority") || 100),
              state: String(fd.get("state") || "") || null,
            });
            if (!res.ok) {
              setError(res.message);
              return;
            }
            // Hard navigation: soft router.push after server action can stall on this route.
            window.location.assign(
              `/${tenantSlug}/tributario/regras/${res.id}`,
            );
          } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar draft");
          }
        });
      }}
    >
      <GFTaxRuleEditor disabled={pending} />
      <label className="block text-xs">
        Prioridade
        <input
          name="priority"
          type="number"
          defaultValue={100}
          className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs">
        UF (escopo opcional)
        <input
          name="state"
          placeholder="ex.: SP"
          className="mt-1 w-full rounded-lg border border-[var(--gf-border-subtle)] px-2 py-1.5 text-sm"
        />
      </label>
      <p className={gfType.caption}>
        Marcado como TESTE · rateDefinition sem alíquota legal oficial.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <GFButton type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar draft"}
      </GFButton>
    </form>
  );
}

export function TaxRuleWorkflowPanel({
  tenantId,
  tenantSlug,
  userId,
  rule,
}: {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  rule: TaxRule;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editBlocked, setEditBlocked] = useState(false);

  const go = (to: TaxRuleStatus) => {
    setMsg(null);
    start(async () => {
      const res = await transitionTaxRuleAction({
        tenantId,
        userId,
        ruleId: rule.id,
        to,
      });
      setMsg(res.ok ? `Status → ${res.status}` : res.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3" data-tax-workflow-panel="" data-status={rule.status}>
      <div className="flex flex-wrap items-center gap-2">
        <GFTaxWorkflowStatus status={rule.status} />
        <GFTaxWorkflowActions status={rule.status} />
      </div>
      <GFTaxSourceReference source={rule.sourceReference} />
      <p className={gfType.caption}>
        v{rule.version} · vigência {rule.validFrom}
        {rule.validTo ? ` → ${rule.validTo}` : ""} · prioridade {rule.priority}
      </p>

      <div className="flex flex-wrap gap-2">
        {rule.status === "draft" ? (
          <>
            <GFButton
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await updateTaxRuleDraftAction({
                    tenantId,
                    userId,
                    ruleId: rule.id,
                    name: `${rule.name} (editado homolog)`,
                    priority: rule.priority + 1,
                  });
                  setMsg("Draft editado");
                  router.refresh();
                });
              }}
            >
              Editar draft
            </GFButton>
            <GFButton disabled={pending} onClick={() => go("under_review")}>
              Enviar revisão
            </GFButton>
          </>
        ) : null}
        {rule.status === "under_review" ? (
          <GFButton disabled={pending} onClick={() => go("approved")}>
            Aprovar
          </GFButton>
        ) : null}
        {rule.status === "approved" ? (
          <GFButton disabled={pending} onClick={() => go("published")}>
            Publicar
          </GFButton>
        ) : null}
        {rule.status === "published" ? (
          <>
            <GFButton
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const res = await updateTaxRuleDraftAction({
                    tenantId,
                    userId,
                    ruleId: rule.id,
                    name: "tentativa edição publicada",
                  });
                  setEditBlocked(!res.ok);
                  setMsg(res.ok ? "inesperado: editou" : res.message);
                });
              }}
            >
              Tentar editar publicada
            </GFButton>
            {editBlocked ? (
              <span data-edit-blocked="1" className="text-xs text-destructive">
                Edição bloqueada (imutável)
              </span>
            ) : null}
            <GFButton
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const res = await createTaxRuleVersionAction({
                    tenantId,
                    userId,
                    ruleId: rule.id,
                    changeReason: "Homologação 26.10.1 — nova versão",
                  });
                  if (res.ok) {
                    window.location.assign(
                      `/${tenantSlug}/tributario/regras/${res.id}`,
                    );
                    return;
                  }
                  setMsg(res.message);
                });
              }}
            >
              Nova versão
            </GFButton>
            <GFButton disabled={pending} onClick={() => go("suspended")}>
              Suspender
            </GFButton>
            <GFButton disabled={pending} onClick={() => go("archived")}>
              Arquivar
            </GFButton>
          </>
        ) : null}
        {rule.status === "suspended" ? (
          <GFButton disabled={pending} onClick={() => go("archived")}>
            Arquivar
          </GFButton>
        ) : null}
      </div>

      {rule.parentVersionId ? (
        <GFTaxRuleVersionDiff
          changedFields={["version", "status", "parentVersionId"]}
          changeReason="Nova versão a partir de publicada"
        />
      ) : null}

      {msg ? (
        <p className={gfType.caption} data-workflow-message="">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
