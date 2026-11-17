"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  Sparkles,
  Square,
} from "lucide-react";

import {
  AssistantBubble,
  SuggestionChips,
  UserBubble,
} from "@/components/ai-assistant/chat-parts";
import {
  useAiAssistantChat,
  type ChatError,
} from "@/components/ai-assistant/use-ai-assistant-chat";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  splitSugestoes,
  sugestoesIniciais,
} from "@/lib/ai-assistant/ai-assistant-format";
import { cn } from "@/lib/utils";

/** Outras partes da tela (ex.: barra do dashboard) abrem o chat com este evento. */
export const OPEN_AI_ASSISTANT_EVENT = "gnf:open-ai-assistant";

type Props = {
  tenantSlug: string;
  segment?: string | null;
};

function mensagemDeErro(error: ChatError): string {
  if (error.kind === "notConfigured") {
    return "O assistente ainda não foi ativado nesta conta.";
  }
  if (error.kind === "planLocked") {
    return "O assistente de IA é um recurso do plano Essencial em diante.";
  }
  return error.message;
}

export function AiAssistantWidget({ tenantSlug, segment = null }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const chat = useAiAssistantChat(tenantSlug, { loadHistory: open });
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const abrir = () => setOpen(true);
    window.addEventListener(OPEN_AI_ASSISTANT_EVENT, abrir);
    return () => window.removeEventListener(OPEN_AI_ASSISTANT_EVENT, abrir);
  }, []);

  // Acompanha o texto novo, mas respeita quem rolou para cima para reler.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight });
  }, [chat.messages, chat.error]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const submit = useCallback(
    (text: string) => {
      stickToBottom.current = true;
      void chat.send(text);
    },
    [chat],
  );

  function handleSend() {
    const body = draft.trim();
    if (!body || chat.sending) return;
    setDraft("");
    submit(body);
  }

  const ultima = chat.messages[chat.messages.length - 1];
  const sugestoesDaResposta =
    ultima && ultima.role === "assistant" && !ultima.streaming
      ? splitSugestoes(ultima.content).sugestoes
      : [];

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-20 z-40 size-12 rounded-full max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] max-md:right-[4.25rem] max-md:size-11 bg-[var(--brand-gold,#C9A84C)] text-black shadow-lg hover:bg-[var(--brand-gold,#C9A84C)]/90"
        aria-label="Assistente de IA"
      >
        <Sparkles className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex gap-0 p-0 data-[side=right]:w-full",
            expanded ? "data-[side=right]:sm:max-w-3xl" : "data-[side=right]:sm:max-w-xl",
          )}
        >
          <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 py-3 pr-12">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--brand-gold,#C9A84C)]" />
                Gestão no Foco
              </SheetTitle>
              <p className="truncate text-xs text-muted-foreground">
                Inteligência do seu negócio · lê seus números e monta o plano de ação
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void chat.clear()}
                disabled={chat.sending || chat.messages.length === 0}
                aria-label="Nova conversa"
                title="Nova conversa"
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded((v) => !v)}
                className="max-sm:hidden"
                aria-label={expanded ? "Reduzir painel" : "Ampliar painel"}
                title={expanded ? "Reduzir painel" : "Ampliar painel"}
              >
                {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
            </div>
          </SheetHeader>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {chat.loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : chat.messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--brand-gold,#C9A84C)]/30 bg-[var(--brand-gold,#C9A84C)]/[0.05] p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Eu sou a inteligência do seu negócio.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Leio o faturamento, as metas, as ordens de serviço, os clientes e as
                    contas lançadas no sistema e respondo com diagnóstico e plano de ação
                    com prazo e impacto. Pergunte ou escolha um ponto de partida:
                  </p>
                </div>
                <SuggestionChips
                  items={sugestoesIniciais(segment)}
                  onPick={submit}
                  disabled={chat.sending}
                />
              </div>
            ) : (
              chat.messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} message={m} />
                ) : (
                  <AssistantBubble key={m.id} message={m} tenantSlug={tenantSlug} />
                ),
              )
            )}

            {sugestoesDaResposta.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Aprofundar
                </p>
                <SuggestionChips
                  items={sugestoesDaResposta}
                  onPick={submit}
                  disabled={chat.sending}
                />
              </div>
            ) : null}

            {chat.error ? (
              <p
                className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-600"
                role="alert"
              >
                {mensagemDeErro(chat.error)}
              </p>
            ) : null}
          </div>

          <div className="border-t border-border/60 px-4 pb-3 pt-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pergunte sobre seus números ou peça um plano de ação…"
                rows={2}
                maxLength={4000}
                className="min-h-0 flex-1 resize-none"
              />
              {chat.sending ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={chat.stop}
                  aria-label="Parar resposta"
                  title="Parar resposta"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  aria-label="Enviar mensagem"
                >
                  <Send className="size-4" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
              A IA analisa os dados lançados no sistema e pode errar. Confira os valores
              importantes antes de decidir.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
