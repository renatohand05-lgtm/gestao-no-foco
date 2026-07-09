export type SortOrder = "asc" | "desc";

export type FinanceiroSuccessMessage = "created" | "updated" | "deleted";

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type ListFinanceiroParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
  ativo?: boolean | "all";
};

/* ─── Plano de Contas ─────────────────────────────────────────────── */

export type PlanoContaTipo =
  | "receita"
  | "despesa"
  | "ativo"
  | "passivo"
  | "patrimonio";

export type PlanoContaNatureza = "sintetica" | "analitica";

export type PlanoContaSortField =
  | "codigo"
  | "nome"
  | "tipo"
  | "natureza"
  | "ativo"
  | "created_at";

export type PlanoConta = {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  tipo: PlanoContaTipo;
  natureza: PlanoContaNatureza;
  conta_pai_id: string | null;
  aceita_lancamento: boolean;
  ordem: number;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanoContaListItem = Pick<
  PlanoConta,
  | "id"
  | "codigo"
  | "nome"
  | "tipo"
  | "natureza"
  | "aceita_lancamento"
  | "ordem"
  | "ativo"
  | "created_at"
>;

export type PlanoContaTreeItem = PlanoContaListItem & {
  conta_pai_id: string | null;
};

export type PlanoContaTreeNode = PlanoContaTreeItem & {
  depth: number;
  children: PlanoContaTreeNode[];
};

export type PlanoContaSelectOption = {
  id: string;
  codigo: string;
  nome: string;
  depth: number;
  label: string;
};

export type PlanoContaResumo = {
  id: string;
  codigo: string;
  nome: string;
};

export type PlanoContaInput = {
  codigo: string;
  nome: string;
  tipo: PlanoContaTipo;
  natureza: PlanoContaNatureza;
  conta_pai_id?: string | null;
  aceita_lancamento: boolean;
  ordem?: number;
  observacoes?: string | null;
  ativo: boolean;
};

export type CreatePlanoContaInput = PlanoContaInput;
export type UpdatePlanoContaInput = Partial<PlanoContaInput>;

export type ListPlanoContasParams = ListFinanceiroParams & {
  sort?: PlanoContaSortField;
  tipo?: PlanoContaTipo | "all";
  natureza?: PlanoContaNatureza | "all";
};

/* ─── Centros de Custo ────────────────────────────────────────────── */

export type CentroCustoSortField =
  | "codigo"
  | "nome"
  | "ativo"
  | "created_at";

export type CentroCusto = {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  responsavel: string | null;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CentroCustoListItem = Pick<
  CentroCusto,
  | "id"
  | "codigo"
  | "nome"
  | "descricao"
  | "responsavel"
  | "ativo"
  | "created_at"
>;

export type CentroCustoInput = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  ativo: boolean;
};

export type CreateCentroCustoInput = CentroCustoInput;
export type UpdateCentroCustoInput = Partial<CentroCustoInput>;

export type ListCentrosCustoParams = ListFinanceiroParams & {
  sort?: CentroCustoSortField;
};

/* ─── Contas Bancárias ────────────────────────────────────────────── */

export type ContaBancariaTipo =
  | "corrente"
  | "poupanca"
  | "investimento"
  | "caixa"
  | "outros";

export type ContaBancariaSortField =
  | "nome"
  | "tipo"
  | "banco"
  | "ativo"
  | "created_at";

export type ContaBancaria = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: ContaBancariaTipo;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  titular: string | null;
  saldo_inicial: number;
  saldo_atual: number;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContaBancariaListItem = Pick<
  ContaBancaria,
  | "id"
  | "nome"
  | "tipo"
  | "banco"
  | "agencia"
  | "conta"
  | "saldo_inicial"
  | "saldo_atual"
  | "ativo"
  | "created_at"
>;

export type ContaBancariaInput = {
  nome: string;
  tipo: ContaBancariaTipo;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  titular?: string | null;
  saldo_inicial?: number;
  observacoes?: string | null;
  ativo: boolean;
};

export type CreateContaBancariaInput = ContaBancariaInput;
export type UpdateContaBancariaInput = Partial<ContaBancariaInput>;

export type ListContasBancariasParams = ListFinanceiroParams & {
  sort?: ContaBancariaSortField;
  tipo?: ContaBancariaTipo | "all";
};

/* ─── Formas de Pagamento ─────────────────────────────────────────── */

export type FormaPagamentoTipo =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "boleto"
  | "transferencia"
  | "cheque"
  | "outros";

export type FormaPagamentoSortField =
  | "nome"
  | "tipo"
  | "ativo"
  | "created_at";

export type FormaPagamento = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: FormaPagamentoTipo;
  gera_financeiro: boolean;
  dias_compensacao: number;
  taxa_percent: number | null;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FormaPagamentoListItem = Pick<
  FormaPagamento,
  | "id"
  | "nome"
  | "tipo"
  | "gera_financeiro"
  | "dias_compensacao"
  | "taxa_percent"
  | "ativo"
  | "created_at"
>;

export type FormaPagamentoInput = {
  nome: string;
  tipo: FormaPagamentoTipo;
  gera_financeiro: boolean;
  dias_compensacao?: number;
  taxa_percent?: number | null;
  observacoes?: string | null;
  ativo: boolean;
};

export type CreateFormaPagamentoInput = FormaPagamentoInput;
export type UpdateFormaPagamentoInput = Partial<FormaPagamentoInput>;

export type ListFormasPagamentoParams = ListFinanceiroParams & {
  sort?: FormaPagamentoSortField;
  tipo?: FormaPagamentoTipo | "all";
};

/* ─── Categorias Financeiras ──────────────────────────────────────── */

export type CategoriaFinanceiraTipo = "receita" | "despesa" | "ambos";

export type CategoriaFinanceiraSortField =
  | "nome"
  | "tipo"
  | "ativo"
  | "created_at";

export type CategoriaFinanceira = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: CategoriaFinanceiraTipo;
  plano_conta_id: string | null;
  cor: string | null;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoriaFinanceiraListItem = Pick<
  CategoriaFinanceira,
  | "id"
  | "nome"
  | "tipo"
  | "plano_conta_id"
  | "cor"
  | "ativo"
  | "created_at"
>;

export type CategoriaFinanceiraInput = {
  nome: string;
  tipo: CategoriaFinanceiraTipo;
  plano_conta_id?: string | null;
  cor?: string | null;
  observacoes?: string | null;
  ativo: boolean;
};

export type CreateCategoriaFinanceiraInput = CategoriaFinanceiraInput;
export type UpdateCategoriaFinanceiraInput = Partial<CategoriaFinanceiraInput>;

export type ListCategoriasFinanceirasParams = ListFinanceiroParams & {
  sort?: CategoriaFinanceiraSortField;
  tipo?: CategoriaFinanceiraTipo | "all";
};
