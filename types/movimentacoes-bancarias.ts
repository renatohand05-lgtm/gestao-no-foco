import type { SortOrder } from "@/types/financeiro";

export type { PaginatedResult } from "@/types/pagination";

export type MovimentacaoBancariaTipo =
  | "entrada"
  | "saida"
  | "ajuste"
  | "estorno"
  | "transferencia";

export type MovimentacaoBancariaOrigem =
  | "manual"
  | "conta_pagar_baixa"
  | "conta_receber_baixa"
  | "transferencia"
  | "estorno"
  | "ajuste";

export type TransferenciaPapel = "enviada" | "recebida";

export type MovimentacaoBancariaSortField =
  | "created_at"
  | "data_movimentacao"
  | "tipo"
  | "valor"
  | "saldo_novo";

export type MovimentacaoBancaria = {
  id: string;
  tenant_id: string;
  conta_bancaria_id: string;
  conta_bancaria_contrapartida_id: string | null;
  grupo_transferencia_id: string | null;
  tipo: MovimentacaoBancariaTipo;
  transferencia_papel: TransferenciaPapel | null;
  valor: number;
  saldo_anterior: number;
  saldo_novo: number;
  data_movimentacao: string;
  descricao: string;
  origem: MovimentacaoBancariaOrigem;
  conta_pagar_id: string | null;
  conta_receber_id: string | null;
  movimentacao_estornada_id: string | null;
  estornada_por_id: string | null;
  observacoes: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type MovimentacaoBancariaContaResumo = {
  id: string;
  nome: string;
  tipo: string;
  banco: string | null;
};

export type MovimentacaoBancariaListItem = MovimentacaoBancaria & {
  conta_bancaria: MovimentacaoBancariaContaResumo | null;
  conta_contrapartida: MovimentacaoBancariaContaResumo | null;
};

export type MovimentacaoBancariaDetail = MovimentacaoBancariaListItem & {
  movimentacao_estornada?: Pick<
    MovimentacaoBancaria,
    "id" | "tipo" | "valor" | "descricao" | "data_movimentacao"
  > | null;
  estorno_movimentacao?: Pick<
    MovimentacaoBancaria,
    "id" | "tipo" | "valor" | "descricao" | "data_movimentacao"
  > | null;
};

export type CreateMovimentacaoBancariaInput = {
  conta_bancaria_id: string;
  tipo: Extract<MovimentacaoBancariaTipo, "entrada" | "saida" | "ajuste">;
  valor: number;
  data_movimentacao: string;
  descricao: string;
  origem?: MovimentacaoBancariaOrigem;
  conta_pagar_id?: string | null;
  conta_receber_id?: string | null;
  observacoes?: string | null;
};

export type CreateTransferenciaBancariaInput = {
  conta_origem_id: string;
  conta_destino_id: string;
  valor: number;
  data_movimentacao: string;
  descricao: string;
  observacoes?: string | null;
};

export type EstornarMovimentacaoBancariaInput = {
  data_movimentacao: string;
  observacoes?: string | null;
};

export type ListMovimentacoesBancariasParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: MovimentacaoBancariaSortField;
  order?: SortOrder;
  tipo?: MovimentacaoBancariaTipo | "all";
  origem?: MovimentacaoBancariaOrigem | "all";
  contaBancariaId?: string;
  dataDe?: string;
  dataAte?: string;
};

export type { FluxoCaixaContaSaldo } from "@/types/fluxo-caixa";

export type MovimentacaoBancariaSuccessMessage = "created" | "deleted" | "estornado";

export type ContaBancariaOption = {
  id: string;
  nome: string;
  saldo_atual: number;
};
