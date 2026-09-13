"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";

import { sendAiAssistantMessage } from "@/lib/ai-assistant/ai-assistant-actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
};

const SUGGESTIONS = [
  "Quais clientes estão sem compra há mais de 30 dias?",
  "Me mostre os produtos de maior margem",
  "Qual a projeção de faturamento do mês?",
  "Liste as OS pendentes",
];

/**
 * Barra do assistente embutida no rodapé do dashboard — mesma lógica do
 * assistente já existente (botão flutuante), só num formato de campo de
 * busca inline em vez de painel lateral.
 */
export function DashboardAiBar({ tenantSlug }: Props) {
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function ask(question: string) {
    setError(null);
    setAnswer(null);
    setDraft(question);
    startTransition(async () => {
      const result = await sendAiAssistantMessage(tenantSlug, question);
      if (!result.success) {
        setError(
          result.notConfigured
            ? "O assistente ainda não foi ativado nesta conta."
            : result.planLocked
              ? "O assistente de IA é um recurso do plano Essencial em diante."
              : result.error,
        );
        return;
      }
      setAnswer(result.data.content);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (q) ask(q);
  }

  return (
    <div
      data-dashboard-block="ai-bar"
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        "border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/[0.04]",
      )}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pergunte sobre seus dados, peça análises ou recomendações…"
          className="h-10 flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          aria-label="Enviar pergunta"
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
            "bg-[var(--brand-gold)] text-[var(--brand-navy)]",
            "disabled:opacity-50",
          )}
        >
          <Send className="size-4" aria-hidden />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={isPending}
            className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-[var(--brand-gold)]/50 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="mt-3 text-xs text-muted-foreground">Pensando…</p>
      ) : error ? (
        <p className="mt-3 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : answer ? (
        <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm whitespace-pre-wrap">
          {answer}
        </p>
      ) : null}
    </div>
  );
}
