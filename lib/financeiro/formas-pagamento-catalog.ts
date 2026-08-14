/**
 * Sprint 34.9 — Catálogo mínimo de formas de pagamento para Contas a Pagar.
 * Garante opções operacionais no tenant sem inventar meios bancários reais.
 * Preserva linhas legadas (CREDITO/DEBITO/DINHEIRO/PIX); só adiciona o que faltar.
 */

export type FormaPagamentoCatalogTipo =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "boleto"
  | "transferencia"
  | "cheque"
  | "outros";

export type FormaPagamentoCatalogItem = {
  /** Chave estável para match/idempotência (não é UUID). */
  key: string;
  nome: string;
  tipo: FormaPagamentoCatalogTipo;
  /** Nomes legados/variações que já cobrem este item (não inserir de novo). */
  aliases: readonly string[];
};

function n(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Catálogo CAP exigido pela UX 34.9 — sem DOC. */
export const CONTAS_PAGAR_FORMAS_CATALOG: readonly FormaPagamentoCatalogItem[] = [
  {
    key: "pix",
    nome: "PIX",
    tipo: "pix",
    aliases: ["pix"],
  },
  {
    key: "cartao_credito",
    nome: "Cartão de crédito",
    tipo: "cartao_credito",
    aliases: ["credito", "cartao de credito", "cartao credito", "crédito"],
  },
  {
    key: "cartao_debito",
    nome: "Cartão de débito",
    tipo: "cartao_debito",
    aliases: ["debito", "cartao de debito", "cartao debito", "débito"],
  },
  {
    key: "dinheiro",
    nome: "Dinheiro",
    tipo: "dinheiro",
    aliases: ["dinheiro", "especie", "espécie"],
  },
  {
    key: "transferencia",
    nome: "Transferência bancária",
    tipo: "transferencia",
    aliases: [
      "transferencia",
      "transferencia bancaria",
      "ted",
      "transf",
      "transferência bancária",
    ],
  },
  {
    key: "boleto",
    nome: "Boleto",
    tipo: "boleto",
    aliases: ["boleto"],
  },
  {
    key: "debito_automatico",
    nome: "Débito automático",
    tipo: "outros",
    aliases: ["debito automatico", "débito automático"],
  },
  {
    key: "deposito",
    nome: "Depósito bancário",
    tipo: "outros",
    aliases: ["deposito", "deposito bancario", "depósito bancário"],
  },
  {
    key: "debito_conta",
    nome: "Débito em conta",
    tipo: "outros",
    aliases: ["debito em conta", "débito em conta", "dcc"],
  },
  {
    key: "guia",
    nome: "Guia / código de barras",
    tipo: "outros",
    aliases: ["guia", "codigo de barras", "código de barras", "guia / codigo de barras"],
  },
] as const;

export type FormaPagamentoExisting = {
  id: string;
  nome: string;
  tipo?: string | null;
};

export function normalizeFormaNome(nome: string): string {
  return n(nome);
}

/** True se a linha existente já cobre o item do catálogo (legado incluso). */
export function existingCoversCatalogItem(
  existing: FormaPagamentoExisting,
  item: FormaPagamentoCatalogItem,
): boolean {
  const nome = n(existing.nome);
  const tipo = n(existing.tipo ?? "");

  if (item.aliases.some((a) => n(a) === nome)) return true;
  if (nome === n(item.nome)) return true;

  // Match por tipo canônico quando não for "outros" (genérico demais).
  if (item.tipo !== "outros" && tipo === item.tipo) return true;

  return false;
}

export function catalogItemMissing(
  existing: FormaPagamentoExisting[],
  item: FormaPagamentoCatalogItem,
): boolean {
  return !existing.some((row) => existingCoversCatalogItem(row, item));
}

/** Itens do catálogo que ainda não existem no tenant. */
export function missingContasPagarFormas(
  existing: FormaPagamentoExisting[],
): FormaPagamentoCatalogItem[] {
  return CONTAS_PAGAR_FORMAS_CATALOG.filter((item) =>
    catalogItemMissing(existing, item),
  );
}

/** Labels esperados na UI após ensure (amigáveis + legado mapeado). */
export const CONTAS_PAGAR_FORMAS_UI_LABELS_REQUIRED = [
  "PIX",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Transferência bancária",
  "Boleto",
  "Débito automático",
  "Depósito bancário",
] as const;
