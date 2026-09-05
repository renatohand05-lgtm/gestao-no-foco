"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LifeBuoy, Send } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  fetchTenantConversation,
  markTenantConversationRead,
  submitTenantMessage,
} from "@/lib/support/support-actions";
import type { SupportMessage } from "@/lib/support/support-service";
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

export function HelpWidget({ tenantSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, startSending] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadConversation() {
    const result = await fetchTenantConversation(tenantSlug);
    if (result.success) {
      setTicketId(result.data.ticketId);
      setMessages(result.data.messages);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;

    (async () => {
      const result = await fetchTenantConversation(tenantSlug);
      if (ignore) return;
      if (result.success) {
        setTicketId(result.data.ticketId);
        setMessages(result.data.messages);
      }
      setLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, [open, tenantSlug]);

  useEffect(() => {
    if (!open || !ticketId) return;

    void markTenantConversationRead(tenantSlug, ticketId);

    const supabase = createClient();
    const channel = supabase
      .channel(`support-tenant-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
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
          if (row.sender_role === "platform_owner") {
            void markTenantConversationRead(tenantSlug, ticketId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, ticketId, tenantSlug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    startSending(async () => {
      const result = await submitTenantMessage(tenantSlug, body);
      if (result.success) {
        void loadConversation();
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-lg"
        aria-label="Preciso de ajuda"
      >
        <LifeBuoy className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-[var(--brand-gold,#C9A84C)]" />
              Preciso de ajuda
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
                Escreva sua dúvida ou problema abaixo. A gente responde por
                aqui mesmo.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    m.senderRole === "tenant_user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px] opacity-70",
                      m.senderRole === "tenant_user"
                        ? "text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {m.senderRole === "platform_owner" ? "Suporte · " : ""}
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
              placeholder="Digite sua mensagem…"
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
