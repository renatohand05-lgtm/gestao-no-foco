/**
 * Sprint 22.8 — Contrato CNAB 240/400 (em preparação).
 *
 * CNAB (Centro Nacional de Automação Bancária) é o padrão brasileiro para
 * remessa (.rem) e retorno (.ret) bancário. Layouts 240 e 400 possuem
 * segmentos fixos por banco — o parser completo exige fixtures reais por
 * instituição e homologação com arquivos de produção.
 *
 * Status atual: contrato tipado + UI "Em preparação". Não parsear arquivos
 * .ret/.rem/.cnab até haver fixtures validados — use CSV/Excel/OFX.
 */

export type CnabLayout = "240" | "400";

export type CnabContractStatus = "preparing";

export type CnabSegmentKind =
  | "header_arquivo"
  | "header_lote"
  | "detalhe"
  | "trailer_lote"
  | "trailer_arquivo";

export type CnabSegmentContract = {
  layout: CnabLayout;
  kind: CnabSegmentKind;
  lineNumber: number;
  rawLine: string;
  fields: Record<string, string>;
};

export type CnabParseContract = {
  status: CnabContractStatus;
  layout: CnabLayout | null;
  fileName: string;
  segments: CnabSegmentContract[];
  message: string;
};

export const CNAB_PREPARING_MESSAGE =
  "Importação CNAB (240/400) está em preparação — aguardando fixtures e homologação por banco.";

/** CNAB ainda não suportado para parsing real. */
export function isCnabSupported(): boolean {
  return false;
}

export function createCnabPreparingContract(
  fileName: string,
  layout: CnabLayout | null = null,
): CnabParseContract {
  return {
    status: "preparing",
    layout,
    fileName,
    segments: [],
    message: CNAB_PREPARING_MESSAGE,
  };
}

export function detectCnabLayoutFromLine(line: string): CnabLayout | null {
  const len = line.replace(/\r?\n$/, "").length;
  if (len === 240) return "240";
  if (len === 400) return "400";
  return null;
}
