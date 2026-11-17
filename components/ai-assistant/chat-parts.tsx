"use client";

import { memo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { MarkdownView } from "@/components/ai-assistant/markdown-view";
import type { ChatMessage } from "@/components/ai-assistant/use-ai-assistant-chat";
import { splitSugestoes } from "@/lib/ai-assistant/ai-assistant-format";

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}


export const AssistantBubble = memo(function AssistantBubble({
  message,
  tenantSlug,
}: {
  message: ChatMessage;
  tenantSlug: string;
}) {
  const [copied, setCopied] = useState(false);
  const { corpo } = splitSugestoes(message.content);

  async function copy() {
    try {
      await navigator.clipboard.writeText(corpo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* navegador sem acesso à área de transferência */
    }
  }

  return (
    <div className="w-full rounded-xl bg-muted/60 px-3.5 py-3" data-testid="ai-assistant-reply">
      {corpo ? (
        <MarkdownView text={corpo} tenantSlug={tenantSlug} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex gap-1" aria-hidden>
            <span className="size-1.5 animate-bounce rounded-full bg-[var(--brand-gold,#C9A84C)] [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-[var(--brand-gold,#C9A84C)] [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-[var(--brand-gold,#C9A84C)]" />
          </span>
          Analisando os dados da sua empresa…
        </p>
      )}
      {message.streaming && corpo ? (
        <span
          aria-hidden
          className="mt-1 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-[var(--brand-gold,#C9A84C)]"
        />
      ) : null}
      {!message.streaming && corpo ? (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <span>{formatTime(message.createdAt)}</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background/70 hover:text-foreground"
            aria-label="Copiar resposta"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      ) : null}
    </div>
  );
});

export function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
      <p className="mt-1 text-[10px] opacity-70">{formatTime(message.createdAt)}</p>
    </div>
  );
}

export function SuggestionChips({
  items,
  onPick,
  disabled,
}: {
  items: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s)}
          className="rounded-full border border-[var(--brand-gold,#C9A84C)]/40 bg-[var(--brand-gold,#C9A84C)]/[0.06] px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-[var(--brand-gold,#C9A84C)] hover:bg-[var(--brand-gold,#C9A84C)]/15 disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

