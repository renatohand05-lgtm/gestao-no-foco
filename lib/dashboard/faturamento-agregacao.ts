/**
 * Regra única de faturamento para indicadores do dashboard / metas.
 *
 * Fonte:
 * - vendas com status `faturado` e deleted_at IS NULL → valor líquido (`total`)
 * - contas a receber avulsas (venda_id IS NULL, status ≠ cancelado) → valor_original
 * - OS faturada entra via venda gerada no faturamento (não soma OS + venda)
 * - pagamentos / parcelas NÃO somam faturamento (evita duplicidade)
 *
 * Exclusões: orçamento, em_andamento, cancelado, soft-deleted.
 * Desconto: já refletido em `total` (líquido = subtotal − desconto).
 */

export const FATURAMENTO_STATUS_VALIDO = "faturado" as const;

export type MetaDiaStatus =
  | "sem_meta"
  | "abaixo"
  | "atencao"
  | "atingida"
  | "superada";

export type VendaFaturamentoInput = {
  status: string;
  deleted_at?: string | null;
  subtotal: number;
  desconto_total?: number | null;
  total: number;
  data_venda: string;
};

export type CrAvulsaFaturamentoInput = {
  status: string;
  deleted_at?: string | null;
  venda_id?: string | null;
  valor_original: number;
  data_competencia?: string | null;
  data_emissao?: string | null;
};

export function isVendaValidaParaFaturamento(
  row: Pick<VendaFaturamentoInput, "status" | "deleted_at">,
): boolean {
  if (row.deleted_at) return false;
  return row.status === FATURAMENTO_STATUS_VALIDO;
}

export function isCrAvulsaValidaParaFaturamento(
  row: Pick<CrAvulsaFaturamentoInput, "status" | "deleted_at" | "venda_id">,
): boolean {
  if (row.deleted_at) return false;
  if (row.venda_id) return false;
  return row.status !== "cancelado";
}

/** Valor líquido da venda (já com desconto). */
export function valorLiquidoVenda(
  row: Pick<VendaFaturamentoInput, "total">,
): number {
  return Number(row.total) || 0;
}

export function valorBrutoVenda(
  row: Pick<VendaFaturamentoInput, "subtotal">,
): number {
  return Number(row.subtotal) || 0;
}

export function dataCompetenciaCr(row: CrAvulsaFaturamentoInput): string {
  const raw = row.data_competencia ?? row.data_emissao ?? "";
  return String(raw).slice(0, 10);
}

export function aggregateFaturamentoLiquido(input: {
  vendas: VendaFaturamentoInput[];
  crAvulsas?: CrAvulsaFaturamentoInput[];
  dataDe?: string;
  dataAte?: string;
}): {
  liquido: number;
  bruto: number;
  desconto: number;
  quantidade_vendas: number;
  ticket_medio: number;
} {
  let liquido = 0;
  let bruto = 0;
  let desconto = 0;
  let quantidade = 0;

  for (const v of input.vendas) {
    if (!isVendaValidaParaFaturamento(v)) continue;
    const dia = String(v.data_venda).slice(0, 10);
    if (input.dataDe && dia < input.dataDe) continue;
    if (input.dataAte && dia > input.dataAte) continue;
    const liq = valorLiquidoVenda(v);
    const bru = valorBrutoVenda(v);
    liquido += liq;
    bruto += bru;
    desconto += Number(v.desconto_total) || Math.max(bru - liq, 0);
    quantidade += 1;
  }

  for (const cr of input.crAvulsas ?? []) {
    if (!isCrAvulsaValidaParaFaturamento(cr)) continue;
    const dia = dataCompetenciaCr(cr);
    if (input.dataDe && dia < input.dataDe) continue;
    if (input.dataAte && dia > input.dataAte) continue;
    const valor = Number(cr.valor_original) || 0;
    liquido += valor;
    bruto += valor;
  }

  return {
    liquido,
    bruto,
    desconto,
    quantidade_vendas: quantidade,
    ticket_medio: quantidade > 0 ? liquido / quantidade : 0,
  };
}

/**
 * Status visual meta do dia:
 * - 0–79%: abaixo
 * - 80–99%: atenção
 * - 100%: atingida
 * - >100%: superada
 */
export function classifyMetaDiaStatus(
  percentual: number | null,
  meta: number | null,
): MetaDiaStatus {
  if (meta == null || meta <= 0) {
    if (percentual != null && percentual > 0) return "superada";
    return "sem_meta";
  }
  const pct = percentual ?? 0;
  if (pct > 100) return "superada";
  if (pct >= 100) return "atingida";
  if (pct >= 80) return "atencao";
  return "abaixo";
}

export function calcPercentualAtingido(
  realizado: number,
  meta: number | null,
): number | null {
  if (meta == null || meta <= 0) return null;
  return (realizado / meta) * 100;
}

export function calcFaltaParaMeta(
  realizado: number,
  meta: number | null,
): number | null {
  if (meta == null) return null;
  return Math.max(meta - realizado, 0);
}

export const META_DIA_STATUS_LABEL: Record<MetaDiaStatus, string> = {
  sem_meta: "Sem meta",
  abaixo: "Abaixo",
  atencao: "Atenção",
  atingida: "Atingida",
  superada: "Superada",
};
