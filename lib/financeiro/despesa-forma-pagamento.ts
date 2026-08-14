/**
 * Sprint 34.9 — Sugestão contextual de forma de pagamento por preset de despesa.
 * Não cria enums/colunas. Casa apenas com formas já cadastradas no tenant (tipo + nome).
 * Forma de pagamento permanece atributo operacional do título — sem acoplar à DRE.
 */

import type { DespesaPresetId } from "@/lib/financeiro/despesa-presets";

export type FormaPagamentoPreferenciaKey =
  | "pix"
  | "transferencia"
  | "ted"
  | "deposito"
  | "dinheiro"
  | "debito_conta"
  | "boleto"
  | "debito_automatico"
  | "cartao"
  | "guia";

export type FormaPagamentoMatchable = {
  id: string;
  nome: string;
  tipo?: string | null;
};

const PESSOAL: FormaPagamentoPreferenciaKey[] = [
  "pix",
  "transferencia",
  "ted",
  "deposito",
  "dinheiro",
  "debito_conta",
];

const PRESTADOR_ALUGUEL: FormaPagamentoPreferenciaKey[] = [
  "pix",
  "transferencia",
  "boleto",
  "debito_conta",
  "dinheiro",
];

const UTILIDADES: FormaPagamentoPreferenciaKey[] = [
  "boleto",
  "pix",
  "debito_automatico",
  "cartao",
];

const SERVICOS_ASSINATURAS: FormaPagamentoPreferenciaKey[] = [
  "pix",
  "transferencia",
  "boleto",
  "cartao",
  "debito_automatico",
];

const OPERACIONAL: FormaPagamentoPreferenciaKey[] = [
  "pix",
  "cartao",
  "boleto",
  "transferencia",
  "dinheiro",
];

const TRIBUTOS: FormaPagamentoPreferenciaKey[] = [
  "pix",
  "guia",
  "debito_conta",
  "transferencia",
];

const GENÉRICO: FormaPagamentoPreferenciaKey[] = [
  "pix",
  "transferencia",
  "boleto",
  "dinheiro",
  "cartao",
];

/** Preferências por preset — ordem = prioridade de sugestão. */
export const DESPESA_FORMA_PREFERENCIAS: Record<
  DespesaPresetId,
  readonly FormaPagamentoPreferenciaKey[]
> = {
  salarios: PESSOAL,
  prolabore: PESSOAL,
  comissoes: PESSOAL,
  prestadores: PRESTADOR_ALUGUEL,
  aluguel: PRESTADOR_ALUGUEL,
  condominio: UTILIDADES,
  energia: UTILIDADES,
  agua: UTILIDADES,
  internet: UTILIDADES,
  telefone: UTILIDADES,
  contabilidade: SERVICOS_ASSINATURAS,
  royalties: SERVICOS_ASSINATURAS,
  marketing: SERVICOS_ASSINATURAS,
  software: SERVICOS_ASSINATURAS,
  combustivel: OPERACIONAL,
  frete: OPERACIONAL,
  manutencao: OPERACIONAL,
  material_escritorio: OPERACIONAL,
  impostos: TRIBUTOS,
  seguros: SERVICOS_ASSINATURAS,
  tarifas_bancarias: ["debito_conta", "debito_automatico", "transferencia", "pix"],
  outras: GENÉRICO,
};

function n(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** DOC não é incentivado em novos lançamentos. */
export function isFormaPagamentoDoc(forma: FormaPagamentoMatchable): boolean {
  const nome = n(forma.nome);
  return /\bdoc\b/.test(nome) || nome === "doc";
}

export function formaMatchesPreferencia(
  forma: FormaPagamentoMatchable,
  key: FormaPagamentoPreferenciaKey,
): boolean {
  if (isFormaPagamentoDoc(forma)) return false;

  const nome = n(forma.nome);
  const tipo = n(forma.tipo ?? "");

  switch (key) {
    case "pix":
      return tipo === "pix" || /\bpix\b/.test(nome);
    case "ted":
      return /\bted\b/.test(nome);
    case "deposito":
      return /deposito/.test(nome);
    case "dinheiro":
      return tipo === "dinheiro" || /\bdinheiro\b/.test(nome) || /\bespecie\b/.test(nome);
    case "debito_conta":
      return (
        /debito\s*(em\s*)?conta/.test(nome) ||
        /debito\s*conta/.test(nome) ||
        /\bdcc\b/.test(nome)
      );
    case "boleto":
      return tipo === "boleto" || /\bboleto\b/.test(nome);
    case "debito_automatico":
      return /debito\s*automatic/.test(nome);
    case "cartao":
      return (
        tipo === "cartao_credito" ||
        tipo === "cartao_debito" ||
        /cartao/.test(nome)
      );
    case "guia":
      return (
        /\bguia\b/.test(nome) ||
        /codigo\s*(de\s*)?barras/.test(nome) ||
        /\bdar\b/.test(nome) ||
        /\bgps\b/.test(nome)
      );
    case "transferencia":
      if (/\bted\b/.test(nome) || /deposito/.test(nome)) return false;
      return (
        tipo === "transferencia" ||
        /transferencia/.test(nome) ||
        /\btransf\b/.test(nome)
      );
    default:
      return false;
  }
}

export function getFormaPreferenciasForPreset(
  presetId: DespesaPresetId | "" | null | undefined,
): readonly FormaPagamentoPreferenciaKey[] {
  if (!presetId) return [];
  return DESPESA_FORMA_PREFERENCIAS[presetId] ?? [];
}

function bestPreferenceIndex(
  forma: FormaPagamentoMatchable,
  preferencias: readonly FormaPagamentoPreferenciaKey[],
): number {
  if (isFormaPagamentoDoc(forma)) return 10_000;
  let best = 999;
  for (let i = 0; i < preferencias.length; i++) {
    if (formaMatchesPreferencia(forma, preferencias[i]!)) {
      best = Math.min(best, i);
    }
  }
  return best;
}

/** Ordena formas: preferidas primeiro (por prioridade), DOC por último, resto por nome. */
export function orderFormasPagamentoForPreset(
  formas: FormaPagamentoMatchable[],
  presetId: DespesaPresetId | "" | null | undefined,
): FormaPagamentoMatchable[] {
  const preferencias = getFormaPreferenciasForPreset(presetId);
  if (preferencias.length === 0) {
    return [...formas].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }

  return [...formas].sort((a, b) => {
    const ia = bestPreferenceIndex(a, preferencias);
    const ib = bestPreferenceIndex(b, preferencias);
    if (ia !== ib) return ia - ib;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/** Primeira forma do tenant que casa com a prioridade do preset — ou null. */
export function suggestFormaPagamentoId(
  formas: FormaPagamentoMatchable[],
  presetId: DespesaPresetId | "" | null | undefined,
): string | null {
  const preferencias = getFormaPreferenciasForPreset(presetId);
  if (!preferencias.length || !formas.length) return null;

  for (const key of preferencias) {
    const hit = formas.find((f) => formaMatchesPreferencia(f, key));
    if (hit) return hit.id;
  }
  return null;
}

export type SuggestFormaResult = {
  suggestedId: string | null;
  ordered: FormaPagamentoMatchable[];
  preferredCount: number;
};

export function resolveFormasForPreset(
  formas: FormaPagamentoMatchable[],
  presetId: DespesaPresetId | "" | null | undefined,
): SuggestFormaResult {
  const ordered = orderFormasPagamentoForPreset(formas, presetId);
  const preferencias = getFormaPreferenciasForPreset(presetId);
  const preferredCount = preferencias.length
    ? ordered.filter((f) => bestPreferenceIndex(f, preferencias) < 999).length
    : 0;
  return {
    suggestedId: suggestFormaPagamentoId(formas, presetId),
    ordered,
    preferredCount,
  };
}
