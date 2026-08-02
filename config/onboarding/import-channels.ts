/**
 * Sprint 30.3 — Arquitetura preparada para importação.
 * Sem integração real (Excel/CSV/PDF/ERP/API) nesta sprint.
 */

export type ImportChannelId = "excel" | "csv" | "pdf" | "erp" | "api";

export type ImportChannelStatus = "planned" | "ready_architecture";

export type ImportChannelDef = {
  id: ImportChannelId;
  label: string;
  description: string;
  status: ImportChannelStatus;
  /** Domínios sugeridos — não executa import */
  suggestedDomains: string[];
};

export const IMPORT_CHANNELS: readonly ImportChannelDef[] = [
  {
    id: "excel",
    label: "Excel",
    description: "Planilhas .xlsx para catálogo, clientes e financeiro.",
    status: "ready_architecture",
    suggestedDomains: ["produtos", "clientes", "financeiro"],
  },
  {
    id: "csv",
    label: "CSV",
    description: "Arquivos texto delimitados para carga assistida.",
    status: "ready_architecture",
    suggestedDomains: ["produtos", "clientes", "estoque"],
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Documentos para revisão assistida (sem OCR automático nesta fase).",
    status: "planned",
    suggestedDomains: ["notas", "contratos"],
  },
  {
    id: "erp",
    label: "ERP",
    description: "Conectores futuros com ERPs de mercado.",
    status: "planned",
    suggestedDomains: ["financeiro", "estoque", "vendas"],
  },
  {
    id: "api",
    label: "API",
    description: "Entrada via API enterprise (flags desligadas por padrão).",
    status: "planned",
    suggestedDomains: ["integracoes"],
  },
] as const;

export function getImportChannel(id: ImportChannelId): ImportChannelDef {
  const found = IMPORT_CHANNELS.find((c) => c.id === id);
  if (!found) throw new Error(`Canal de importação desconhecido: ${id}`);
  return found;
}
