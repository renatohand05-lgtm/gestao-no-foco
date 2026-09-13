export type ContagemPeriodicidade = "semanal" | "quinzenal" | "mensal" | "avulsa";
export type ContagemStatus = "aberta" | "fechada";

export type EstoqueContagem = {
  id: string;
  tenant_id: string;
  periodicidade: ContagemPeriodicidade;
  status: ContagemStatus;
  data_inicio: string;
  data_fim: string | null;
  estoque_inicial_valor: number | null;
  compras_periodo_valor: number | null;
  estoque_final_valor: number | null;
  perdas_valor: number | null;
  sobras_valor: number | null;
  cmv_sugerido: number | null;
  observacoes: string | null;
  created_by: string | null;
  fechada_por: string | null;
  fechada_em: string | null;
  created_at: string;
  updated_at: string;
};

export type EstoqueContagemListItem = EstoqueContagem & {
  total_itens: number;
  itens_contados: number;
};

export type EstoqueContagemItemProduto = {
  id: string;
  nome: string;
  sku: string | null;
  unidade_medida: string;
  categoria: string | null;
};

export type EstoqueContagemItem = {
  id: string;
  contagem_id: string;
  produto_id: string;
  quantidade_sistema: number;
  custo_unitario_snapshot: number;
  quantidade_contada: number | null;
  diferenca: number | null;
  observacao: string | null;
  produto: EstoqueContagemItemProduto | null;
};

export type EstoqueContagemDetail = EstoqueContagem & {
  itens: EstoqueContagemItem[];
};

export type CreateContagemInput = {
  periodicidade: ContagemPeriodicidade;
};

export type SalvarItemContagemInput = {
  produto_id: string;
  quantidade_contada: number;
  observacao?: string | null;
};

export type FecharContagemResult = {
  itensSemContagem: number;
  itensAjustados: number;
  perdasValor: number;
  sobrasValor: number;
  cmvSugerido: number;
};

export const CONTAGEM_PERIODICIDADE_LABELS: Record<ContagemPeriodicidade, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  avulsa: "Avulsa",
};

export const CONTAGEM_PERIODICIDADE_OPTIONS = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "avulsa", label: "Avulsa (sem repetição fixa)" },
] as const;
