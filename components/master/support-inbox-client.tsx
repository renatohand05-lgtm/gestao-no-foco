"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Check, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  closeOwnerTicket,
  fetchOwnerTickets,
  fetchTicketThread,
  markOwnerTicketRead,
  submitOwnerMessage,
} from "@/lib/support/support-actions";
import type {
  SupportMessage,
  SupportTicketSummary,
} from "@/lib/support/support-service";
import { cn } from "@/lib/utils";

function formatRelative(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  initialTickets: SupportTicketSummary[];
};

export function SupportInboxClient({ initialTickets }: Props) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTickets[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingThread, setLoadingThread] = useState(true);
  const [isSending, startSending] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  async function refreshTickets() {
    const result = await fetchOwnerTickets();
    if (result.success) setTickets(result.data);
  }

  async function loadThread(ticketId: string) {
    const result = await fetchTicketThread(ticketId);
    if (result.success) setMessages(result.data);
    setLoadingThread(false);
    void markOwnerTicketRead(ticketId);
  }

  useEffect(() => {
    if (!selectedId) return;
    let ignore = false;

    (async () => {
      const result = await fetchTicketThread(selectedId);
      if (ignore) return;
      if (result.success) setMessages(result.data);
      setLoadingThread(false);
      void markOwnerTicketRead(selectedId);
    })();

    return () => {
      ignore = true;
    };
  }, [selectedId]);

  // Realtime: lista de tickets (qualquer mudança) + mensagens do ticket aberto.
  useEffect(() => {
    const supabase = createClient();
    const ticketsChannel = supabase
      .channel("support-owner-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => void refreshTickets(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ticketsChannel);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`support-owner-thread-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${selectedId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            ticket_id: string;
            sender_id: string;
            sender_role: "tenant_user" | "platform_owner";
            body: string;
            created_at: string;
          };
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: row.id,
                    ticketId: row.ticket_id,
                    senderId: row.sender_id,
                    senderRole: row.sender_role,
                    body: row.body,
                    createdAt: row.created_at,
                  },
                ],
          );
          if (row.sender_role === "tenant_user") {
            void markOwnerTicketRead(selectedId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function handleSend() {
    const body = draft.trim();
    if (!body || !selectedId) return;
    setDraft("");
    startSending(async () => {
      const result = await submitOwnerMessage(selectedId, body);
      if (result.success) {
        void loadThread(selectedId);
        void refreshTickets();
      }
    });
  }

  function handleClose() {
    if (!selectedId) return;
    startSending(async () => {
      await closeOwnerTicket(selectedId);
      void refreshTickets();
    });
  }

  return (
    <div className="mx-auto grid h-[calc(100svh-6rem)] max-w-7xl grid-cols-1 gap-0 overflow-hidden rounded-xl border border-border/60 md:grid-cols-[320px_1fr]">
      {/* Lista de tickets */}
      <div
        className={cn(
          "flex flex-col overflow-y-auto border-border/60 md:border-r",
          selectedId ? "hidden md:flex" : "flex",
        )}
      >
        {tickets.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nenhuma solicitação de suporte ainda.
          </p>
        ) : (
          tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "flex flex-col gap-0.5 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                selectedId === t.id && "bg-muted",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {t.tenantName}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatRelative(t.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">
                  {t.lastSenderRole === "platform_owner" ? "Você: " : ""}
                  {t.lastMessagePreview ?? "—"}
                </span>
                {t.unreadForOwner > 0 ? (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                    {t.unreadForOwner > 9 ? "9+" : t.unreadForOwner}
                  </span>
                ) : null}
              </div>
              {t.status === "closed" ? (
                <span className="mt-1 w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Encerrado
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>

      {/* Conversa */}
      <div
        className={cn(
          "flex flex-col",
          selectedId ? "flex" : "hidden md:flex",
        )}
      >
        {!selectedTicket ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  onClick={() => setSelectedId(null)}
                  aria-label="Voltar"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedTicket.tenantName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    /{selectedTicket.tenantSlug}
                  </p>
                </div>
              </div>
              {selectedTicket.status === "open" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isSending}
                >
                  <Check className="size-3.5" />
                  Encerrar
                </Button>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Encerrado
                </span>
              )}
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
            >
              {loadingThread ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      m.senderRole === "platform_owner"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px] opacity-70",
                        m.senderRole === "platform_owner"
                          ? "text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>

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
                placeholder="Responder…"
                rows={2}
                className="min-h-0 flex-1 resize-none"
                disabled={selectedTicket.status === "closed"}
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSend}
                disabled={isSending || !draft.trim() || selectedTicket.status === "closed"}
                aria-label="Enviar resposta"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
