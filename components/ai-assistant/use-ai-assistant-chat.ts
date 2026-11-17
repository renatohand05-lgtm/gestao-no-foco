"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearAiAssistantConversation,
  fetchAiAssistantConversation,
  type AiAssistantMessage,
} from "@/lib/ai-assistant/ai-assistant-actions";
import { splitErro } from "@/lib/ai-assistant/ai-assistant-format";

export type ChatMessage = AiAssistantMessage & { streaming?: boolean };

export type ChatError = {
  kind: "notConfigured" | "planLocked" | "generic";
  message: string;
};

type Options = {
  /** Carrega o histórico salvo sempre que passa a valer true (ex.: ao abrir o painel). */
  loadHistory?: boolean;
};

/**
 * Conversa com o assistente: histórico salvo + resposta aparecendo aos poucos
 * (streaming pela rota /api/ai-assistant/stream).
 */
export function useAiAssistantChat(tenantSlug: string, options: Options = {}) {
  const { loadHistory = false } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(loadHistory);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!loadHistory || sendingRef.current) return;
    let ignore = false;
    (async () => {
      const result = await fetchAiAssistantConversation(tenantSlug);
      if (ignore || sendingRef.current) return;
      if (result.success) {
        setMessages(result.data);
      } else {
        setError({
          kind: result.planLocked ? "planLocked" : "generic",
          message: result.error,
        });
      }
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [loadHistory, tenantSlug]);

  // Fechar a tela interrompe a resposta em andamento.
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sendingRef.current) return;

      sendingRef.current = true;
      setSending(true);
      setError(null);

      const stamp = Date.now();
      const agora = new Date().toISOString();
      const botId = `assistant-${stamp}`;
      setMessages((prev) => [
        ...prev,
        { id: `user-${stamp}`, role: "user", content: text, createdAt: agora },
        { id: botId, role: "assistant", content: "", createdAt: agora, streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      const removerPlaceholder = () =>
        setMessages((prev) => prev.filter((m) => m.id !== botId));
      const atualizar = (content: string, streaming: boolean) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, content, streaming } : m)),
        );

      let acumulado = "";
      let frame = 0;

      try {
        const response = await fetch("/api/ai-assistant/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tenantSlug, message: text }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
            notConfigured?: boolean;
            planLocked?: boolean;
          } | null;
          removerPlaceholder();
          setError({
            kind: data?.planLocked
              ? "planLocked"
              : data?.notConfigured
                ? "notConfigured"
                : "generic",
            message:
              data?.error ?? "Não consegui falar com a IA agora. Tente novamente em instantes.",
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acumulado += decoder.decode(value, { stream: true });
          if (!frame) {
            // no máximo uma atualização de tela por quadro: fluido mesmo com texto longo
            frame = requestAnimationFrame(() => {
              frame = 0;
              atualizar(splitErro(acumulado).texto, true);
            });
          }
        }
        acumulado += decoder.decode();
        if (frame) cancelAnimationFrame(frame);

        const { texto, erro } = splitErro(acumulado);
        if (!texto) {
          removerPlaceholder();
          setError({
            kind: "generic",
            message: erro ?? "A IA não devolveu resposta. Tente reformular a pergunta.",
          });
          return;
        }
        atualizar(texto, false);
        if (erro) setError({ kind: "generic", message: erro });
      } catch (err) {
        if (frame) cancelAnimationFrame(frame);
        const texto = splitErro(acumulado).texto;
        if (texto) {
          atualizar(texto, false); // pessoa parou a resposta: mantém o que já chegou
        } else {
          removerPlaceholder();
        }
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError({
            kind: "generic",
            message: "A conexão caiu durante a resposta. Tente novamente.",
          });
        }
      } finally {
        sendingRef.current = false;
        abortRef.current = null;
        setSending(false);
      }
    },
    [tenantSlug],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clear = useCallback(async () => {
    if (sendingRef.current) return;
    const result = await clearAiAssistantConversation(tenantSlug);
    if (result.success) {
      setMessages([]);
      setError(null);
    } else {
      setError({ kind: "generic", message: result.error });
    }
  }, [tenantSlug]);

  const dismissError = useCallback(() => setError(null), []);

  return { messages, loading, sending, error, send, stop, clear, dismissError };
}
