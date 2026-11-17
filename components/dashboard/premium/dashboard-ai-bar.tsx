"use client";

import { useState } from "react";
import { MessageSquareText, Send, Sparkles, Square } from "lucide-react";

import { OPEN_AI_ASSISTANT_EVENT } from "@/components/ai-assistant/ai-assistant-widget";
import { MarkdownView } from "@/components/ai-assistant/markdown-view";
import { useAiAssistantChat } from "@/components/ai-assistant/use-ai-assistant-chat";
import {
  splitSugestoes,
  sugestoesIniciais,
} from "@/lib/ai-assistant/ai-assistant-format";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  segment?: string | null;
};

/**
 * Barra do assistente embutida no rodapé do dashboard — mesma inteligência e
 * mesma conversa do botão flutuante, num formato de campo de busca inline.
 */
export function DashboardAiBar({ tenantSlug, segment = null }: Props) {
  const [draft, setDraft] = useState("");
  const chat = useAiAssistantChat(tenantSlug);

  const suggestions = sugestoesIniciais(segment).slice(0, 4);

  const ultimaResposta = [...chat.messages].reverse().find((m) => m.role === "assistant");
  const { corpo, sugestoes } = ultimaResposta
    ? splitSugestoes(ultimaResposta.content)
    : { corpo: "", sugestoes: [] as string[] };

  function ask(question: string) {
    if (chat.sending) return;
    setDraft("");
    void chat.send(question);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (q) ask(q);
  }

  function openChat() {
    window.dispatchEvent(new CustomEvent(OPEN_AI_ASSISTANT_EVENT));
  }

  const erro =
    chat.error?.kind === "notConfigured"
      ? "O assistente ainda não foi ativado nesta conta."
      : chat.error?.kind === "planLocked"
        ? "O assistente de IA é um recurso do plano Essencial em diante."
        : chat.error?.message;

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
          maxLength={4000}
          placeholder="Pergunte sobre seus dados, peça análises ou um plano de ação…"
          className="h-10 flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm"
        />
        {chat.sending ? (
          <button
            type="button"
            onClick={chat.stop}
            aria-label="Parar resposta"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background"
          >
            <Square className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Enviar pergunta"
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
              "bg-[var(--brand-gold)] text-[var(--brand-navy)]",
              "disabled:opacity-50",
            )}
          >
            <Send className="size-4" aria-hidden />
          </button>
        )}
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={chat.sending}
            className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-[var(--brand-gold)]/50 hover:text-foreground disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {erro ? (
        <p className="mt-3 text-xs text-red-600" role="alert">
          {erro}
        </p>
      ) : null}

      {ultimaResposta ? (
        <div className="mt-3 rounded-xl bg-muted/60 p-3.5">
          {corpo ? (
            <div className="max-h-[32rem] overflow-y-auto pr-1">
              <MarkdownView text={corpo} tenantSlug={tenantSlug} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Analisando os dados da sua empresa…
            </p>
          )}
          {!ultimaResposta.streaming && corpo ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
              <button
                type="button"
                onClick={openChat}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-gold)]/15 px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--brand-gold)]/25"
              >
                <MessageSquareText className="size-3.5" aria-hidden />
                Continuar no chat
              </button>
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={chat.sending}
                  className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-[var(--brand-gold)]/50 hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
