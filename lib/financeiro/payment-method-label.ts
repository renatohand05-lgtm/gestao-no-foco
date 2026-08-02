/**
 * Labels canônicos de tipo de forma de pagamento (Sprint 27.8.2).
 * Catálogo do banco (nome) tem prioridade na UI; este mapa cobre códigos técnicos.
 * Sem path-alias — testável em Node puro.
 */

const CANONICAL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  boleto: "Boleto",
  transferencia: "Transferência bancária",
  transferencia_bancaria: "Transferência bancária",
  cheque: "Cheque",
  crediario: "Crediário",
  outro: "Outro",
  outros: "Outros",
};

export function getPaymentMethodLabel(code: string | null | undefined): string {
  if (!code?.trim()) return "Não informado";
  const key = code.trim().toLowerCase();
  return CANONICAL[key] ?? humanizeSnake(key);
}

function humanizeSnake(code: string): string {
  if (!/^[a-z0-9_]+$/.test(code)) return code;
  const text = code.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isFriendlyCatalogName(nome: string): boolean {
  const n = nome.trim();
  if (!n) return false;
  // snake_case técnico
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(n)) return false;
  // Código curto em MAIÚSCULAS (CREDITO, PIX, DEBITO…)
  if (/^[A-Z0-9_]{2,24}$/.test(n)) return false;
  return true;
}

/** Label de exibição: nome amigável do catálogo, senão tipo mapeado. */
export function formatFormaPagamentoLabel(input: {
  nome?: string | null;
  tipo?: string | null;
}): string {
  const nome = input.nome?.trim();
  if (nome && isFriendlyCatalogName(nome)) return nome;
  if (input.tipo) return getPaymentMethodLabel(input.tipo);
  if (nome) return getPaymentMethodLabel(nome.toLowerCase());
  return "Forma de pagamento";
}
