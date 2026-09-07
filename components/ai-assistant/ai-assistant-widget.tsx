"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAiAssistantConversation,
  sendAiAssistantMessage,
  type AiAssistantMessage,
} from "@/lib/ai-assistant/ai-assistant-actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiAssistantWidget({ tenantSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiAssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let ignore = false;

    (async () => {
      const result = await fetchAiAssistantConversation(tenantSlug);
      if (ignore) return;
      if (result.success) {
        setMessages(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, [open, tenantSlug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    setNotConfigured(false);

    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user",
        content: body,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");

    startSending(async () => {
      const result = await sendAiAssistantMessage(tenantSlug, body);
      if (!result.success) {
        setError(result.error);
        if (result.notConfigured) setNotConfigured(true);
        return;
      }
      setMessages((prev) => [...prev, result.data]);
    });
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-20 z-40 size-12 rounded-full bg-[var(--brand-gold,#C9A84C)] text-black shadow-lg hover:bg-[var(--brand-gold,#C9A84C)]/90"
        aria-label="Assistente de IA"
      >
        <Sparkles className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--brand-gold,#C9A84C)]" />
              Assistente Gestão no Foco
            </SheetTitle>
          </SheetHeader>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 pb-2"
          >
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Pergunte como usar o sistema, ou sobre os dados da sua
                empresa (financeiro, vendas). Estou aqui pra ajudar.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px] opacity-70",
                      m.role === "user"
                        ? "text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatTime(m.createdAt)}
                  </p>
                </div>
              ))
            )}
            {isSending ? (
              <p className="text-xs text-muted-foreground">Pensando…</p>
            ) : null}
          </div>

          {error ? (
            <p className="px-4 text-xs text-red-600" role="alert">
              {notConfigured
                ? "O assistente ainda não foi ativado nesta conta."
                : error}
            </p>
          ) : null}

          <div className="flex items-end gap-2 border-t border-border/60 px-4 py-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua pergunta…"
              rows={2}
              className="min-h-0 flex-1 resize-none"
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={isSending || !draft.trim()}
              aria-label="Enviar mensagem"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
