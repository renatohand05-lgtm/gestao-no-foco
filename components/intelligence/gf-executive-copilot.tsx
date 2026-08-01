"use client";

import { GFConfidenceBadge } from "@/components/intelligence/gf-confidence-badge";
import { GFEvidenceDrawer } from "@/components/intelligence/gf-evidence-drawer";
import { GFFeedbackControl } from "@/components/intelligence/gf-feedback-control";
import { GFProviderStatus } from "@/components/intelligence/gf-provider-status";
import { GFSection } from "@/components/gf/gf-section";
import { GFButton } from "@/components/gf/gf-button";
import { COPILOT_SUGGESTIONS } from "@/lib/intelligence/enterprise/copilot/core";
import type { AskIntelligenceResult } from "@/lib/intelligence/enterprise/actions";
import type { IntelligenceFeedback } from "@/lib/intelligence/enterprise/types";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";

type Props = {
  tenantSlug: string;
  onAsk: (question: string) => Promise<AskIntelligenceResult>;
  onFeedback?: (input: {
    responseId: string;
    rating: IntelligenceFeedback["rating"];
    correlationId: string;
  }) => Promise<void>;
};

/**
 * Copiloto Executivo — identidade GF preservada (Fase 27 / 27.6.2).
 */
export function GFExecutiveCopilot({ tenantSlug, onAsk, onFeedback }: Props) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskIntelligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ask = (q: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await onAsk(q);
        setResponse(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao consultar");
      }
    });
  };

  return (
    <GFSection
      title="Copiloto Executivo"
      description="Modo Determinístico · evidências obrigatórias · sem inventar números · sem IA generativa."
      surface="elevated"
      actions={
        response ? (
          <GFProviderStatus
            mode={response.mode}
            label={response.provider.label}
          />
        ) : (
          <GFProviderStatus mode="deterministic" label="Regras locais" />
        )
      }
    >
      <div
        data-gf-executive-copilot=""
        data-sprint="27.6.2"
        data-tenant={tenantSlug}
        className="space-y-[var(--gf-space-block)]"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="copilot-input">
            Pergunta
          </label>
          <input
            id="copilot-input"
            data-gf-intelligence-input=""
            className={cn(
              "min-h-11 flex-1 rounded-xl border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)]",
              "px-3 text-sm text-[var(--text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
            )}
            value={question}
            disabled={pending}
            placeholder="Pergunte sobre caixa, riscos, prioridades…"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && question.trim()) ask(question.trim());
            }}
          />
          <GFButton
            disabled={pending || !question.trim()}
            onClick={() => ask(question.trim())}
          >
            {pending ? "Analisando…" : "Perguntar"}
          </GFButton>
        </div>

        <div className="flex flex-wrap gap-2" data-copilot-suggestions="">
          {COPILOT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                "rounded-lg border border-[var(--gf-border-subtle)] px-2.5 py-1.5 text-left text-xs",
                "text-[var(--text-secondary)] hover:border-[var(--gf-border-active)]",
              )}
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              disabled={pending}
            >
              {s}
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {pending && !response ? (
          <p className={gfType.caption} role="status">
            Analisando com fontes canônicas…
          </p>
        ) : null}

        {response ? (
          <div className="space-y-3" data-copilot-response="">
            <div className="flex flex-wrap items-center gap-2">
              <GFConfidenceBadge confidence={response.confidence} />
              <span className={gfType.caption}>
                Modo: {response.mode} · status: {response.status}
              </span>
              <span
                className={gfType.caption}
                data-persistence-ready={response.persistence.ready ? "1" : "0"}
              >
                Persistência:{" "}
                {response.persistence.ready ? "gravada" : "indisponível"}
              </span>
            </div>
            <p className={cn(gfType.body, "text-pretty")}>{response.answer}</p>
            {response.limitations.length > 0 ? (
              <ul className={cn(gfType.caption, "list-disc pl-4")}>
                {response.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : null}
            <GFEvidenceDrawer evidence={response.evidence} />
            {response.actions.length > 0 ? (
              <div data-gf-action-plan="" className="space-y-2">
                <p className={gfType.sectionTitle}>Plano de ação (rascunho)</p>
                {response.actions.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-xl border border-[var(--gf-border-subtle)] p-3"
                  >
                    <p className={gfType.cardTitle}>{p.objective}</p>
                    <p className={gfType.caption}>
                      Status {p.status} · prioridade {p.priority} · não executa
                      automaticamente
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
            {response.recommendations.length > 0 ? (
              <div data-gf-recommendation-list="" className="space-y-2">
                <p className={gfType.sectionTitle}>Recomendações (rascunho)</p>
                {response.recommendations.map((r) => (
                  <article
                    key={r.id}
                    data-gf-recommendation-card=""
                    className="rounded-xl border border-[var(--gf-border-subtle)] p-3"
                  >
                    <p className={gfType.cardTitle}>{r.title}</p>
                    <p className={gfType.caption}>{r.summary}</p>
                  </article>
                ))}
              </div>
            ) : null}
            {onFeedback ? (
              <GFFeedbackControl
                onSubmit={(rating) => {
                  void onFeedback({
                    responseId: response.id,
                    rating,
                    correlationId: response.correlationId,
                  });
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </GFSection>
  );
}
