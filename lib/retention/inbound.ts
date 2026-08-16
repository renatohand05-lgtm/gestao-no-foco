/**
 * Sprint 35.2.2 — inbound WhatsApp. Sem IA.
 */

export function isAffirmativeReply(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
  return normalized === "sim" || normalized === "s" || normalized === "yes";
}

export function normalizeInboundAddress(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * SIM só vira intenção quando a conversa está ligada a um retorno ativo.
 * Nunca cria horário.
 */
export function inboundAffirmativeIntent(input: {
  text: string;
  entityType?: string | null;
}): "cliente_respondeu_sim" | null {
  if (!isAffirmativeReply(input.text)) return null;
  if (input.entityType !== "retorno") return null;
  return "cliente_respondeu_sim";
}
