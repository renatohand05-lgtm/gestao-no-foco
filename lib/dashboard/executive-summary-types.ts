/**
 * Resumo Executivo do Dia — tipos (Gate 17.3).
 * Apresentação consolidada — não altera fontes nem contratos.
 */

export type ExecutiveSummaryStatus =
  | "excelente"
  | "saudavel"
  | "atencao"
  | "critico";

export type ExecutiveSummaryPriority = {
  id: string;
  title: string;
  severityLabel: string;
};

export type ExecutiveSummaryData = {
  status: ExecutiveSummaryStatus;
  statusLabel: string;
  statusReason: string;
  prioritiesCount: number;
  priorities: ExecutiveSummaryPriority[];
  recommendations: string[];
};
