"use client";

import { useMemo, useState, useTransition } from "react";

import { ExecutiveCopilotEmptyState } from "@/components/ai/executive-copilot/executive-copilot-empty-state";
import { ExecutiveCopilotInput } from "@/components/ai/executive-copilot/executive-copilot-input";
import { ExecutiveCopilotLoading } from "@/components/ai/executive-copilot/executive-copilot-loading";
import { ExecutiveCopilotResponseView } from "@/components/ai/executive-copilot/executive-copilot-response";
import { ExecutiveCopilotSuggestions } from "@/components/ai/executive-copilot/executive-copilot-suggestions";
import { ExecutiveBadge, ExecutiveSection } from "@/components/executive";
import {
  ExecutiveCopilotEngine,
  type ExecutiveCopilotResponse,
} from "@/lib/ai/executive-copilot-engine";
import type { ExecutiveCopilotAccess } from "@/lib/ai/executive-copilot-types";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import { gofFocusRing, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type HistoryItem = {
  id: string;
  query: string;
  response: ExecutiveCopilotResponse;
};

type Props = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  access?: Partial<ExecutiveCopilotAccess>;
  defaultOpen?: boolean;
};

/**
 * Painel expansível do Copiloto — sessão local, sem persistência (Gate 20.3).
 */
export function ExecutiveCopilotPanel({
  tenantSlug,
  ai,
  decision = null,
  access,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const context = useMemo(
    () =>
      ExecutiveCopilotEngine.buildContext({
        tenantSlug,
        ai,
        decision,
        access,
      }),
    [tenantSlug, ai, decision, access],
  );

  function ask(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setError(null);
    startTransition(() => {
      try {
        const response = ExecutiveCopilotEngine.run({
          query: q,
          tenantSlug,
          ai,
          decision,
          access,
          context,
        });
        setHistory((prev) => [
          {
            id: `${Date.now()}-${prev.length}`,
            query: q,
            response,
          },
          ...prev,
        ].slice(0, 12));
        setQuery("");
      } catch {
        setError("Não foi possível gerar a resposta com as evidências atuais.");
      }
    });
  }

  const latest = history[0] ?? null;

  return (
    <div
      data-dashboard-block="executive-copilot"
      data-copilot-engine={ExecutiveCopilotEngine.version}
      className={cn(gofMotion.fade)}
    >
      <details
        className="rounded-xl border border-border/60 bg-[var(--brand-white)] open:shadow-sm"
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary
          className={cn(
            "cursor-pointer list-none px-4 py-3 sm:px-5",
            gofFocusRing,
            "rounded-xl",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={gofTypography.title}>Copiloto Executivo</p>
              <p className={gofTypography.caption}>
                Assistente baseado em evidências · sem IA generativa
              </p>
            </div>
            <ExecutiveBadge tone="neutral" variant="outline">
              Gate 20.3
            </ExecutiveBadge>
          </div>
        </summary>

        <div className="space-y-4 border-t border-border/50 px-4 py-4 sm:px-5">
          <ExecutiveSection
            title="Perguntas"
            description="Respostas determinísticas a partir do snapshot já carregado."
            className="space-y-3"
          >
            <ExecutiveCopilotSuggestions
              onSelect={(q) => {
                setQuery(q);
                ask(q);
              }}
            />
            <ExecutiveCopilotInput
              value={query}
              onChange={setQuery}
              onSubmit={() => ask(query)}
              disabled={pending}
            />
          </ExecutiveSection>

          {pending ? <ExecutiveCopilotLoading /> : null}

          {error ? (
            <p className={cn(gofTypography.caption, "text-danger")} role="alert">
              {error}
            </p>
          ) : null}

          {!pending && !latest && !error ? (
            <ExecutiveCopilotEmptyState className="py-6" />
          ) : null}

          {latest ? (
            <div className="space-y-3">
              <p className={gofTypography.caption}>
                Você perguntou:{" "}
                <span className="font-medium text-foreground">{latest.query}</span>
              </p>
              <ExecutiveCopilotResponseView response={latest.response} />
            </div>
          ) : null}

          {history.length > 1 ? (
            <details className="rounded-lg border border-border/50">
              <summary
                className={cn(
                  "cursor-pointer list-none px-3 py-2",
                  gofFocusRing,
                  gofTypography.caption,
                )}
              >
                Histórico da sessão ({history.length - 1} anterior
                {history.length - 1 === 1 ? "" : "es"})
              </summary>
              <ul className="space-y-4 border-t border-border/50 px-3 py-3">
                {history.slice(1).map((item) => (
                  <li key={item.id} className="space-y-2">
                    <p className={gofTypography.caption}>{item.query}</p>
                    <ExecutiveCopilotResponseView response={item.response} />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </details>
    </div>
  );
}
