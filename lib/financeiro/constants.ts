export const FINANCEIRO_DEFAULT_PER_PAGE = 10;
export const FINANCEIRO_MAX_PER_PAGE = 50;

export const FINANCEIRO_STATUS_OPTIONS = [
  { value: true, label: "Ativo" },
  { value: false, label: "Inativo" },
] as const;

export const FINANCEIRO_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Inativos" },
] as const;

export const FINANCEIRO_SUCCESS_MESSAGES = {
  created: "Registro cadastrado com sucesso.",
  updated: "Registro atualizado com sucesso.",
  deleted: "Registro excluído com sucesso.",
} as const;

export const CONTAS_RECEBER_SUCCESS_MESSAGES = {
  created: "Conta a receber cadastrada com sucesso.",
  updated: "Conta a receber atualizada com sucesso.",
  deleted: "Conta a receber excluída com sucesso.",
  recebido: "Baixa de recebimento registrada com sucesso.",
  cancelado: "Conta a receber cancelada com sucesso.",
  estornado: "Recebimento estornado com sucesso. Título reaberto.",
} as const;

/* ─── Plano de Contas ─────────────────────────────────────────────── */

export const PLANO_CONTA_TIPO_OPTIONS = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
  { value: "ativo", label: "Ativo" },
  { value: "passivo", label: "Passivo" },
  { value: "patrimonio", label: "Patrimônio" },
] as const;

export const PLANO_CONTA_NATUREZA_OPTIONS = [
  { value: "sintetica", label: "Sintética" },
  { value: "analitica", label: "Analítica" },
] as const;

export const PLANO_CONTA_SORT_OPTIONS = [
  { value: "codigo", label: "Código" },
  { value: "nome", label: "Nome" },
  { value: "tipo", label: "Tipo" },
  { value: "natureza", label: "Natureza" },
  { value: "ativo", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

export const PLANO_CONTA_TIPO_FILTER_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...PLANO_CONTA_TIPO_OPTIONS,
] as const;

export const PLANO_CONTA_NATUREZA_FILTER_OPTIONS = [
  { value: "all", label: "Todas as naturezas" },
  ...PLANO_CONTA_NATUREZA_OPTIONS,
] as const;

/* ─── Centros de Custo ────────────────────────────────────────────── */

export const CENTRO_CUSTO_SORT_OPTIONS = [
  { value: "codigo", label: "Código" },
  { value: "nome", label: "Nome" },
  { value: "ativo", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

/* ─── Contas Bancárias ────────────────────────────────────────────── */

export const CONTA_BANCARIA_TIPO_OPTIONS = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento" },
  { value: "caixa", label: "Caixa" },
  { value: "outros", label: "Outros" },
] as const;

export const CONTA_BANCARIA_SORT_OPTIONS = [
  { value: "nome", label: "Nome" },
  { value: "tipo", label: "Tipo" },
  { value: "banco", label: "Banco" },
  { value: "ativo", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

export const CONTA_BANCARIA_TIPO_FILTER_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...CONTA_BANCARIA_TIPO_OPTIONS,
] as const;

/* ─── Formas de Pagamento ─────────────────────────────────────────── */

export const FORMA_PAGAMENTO_TIPO_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "cheque", label: "Cheque" },
  { value: "outros", label: "Outros" },
] as const;

export const FORMA_PAGAMENTO_SORT_OPTIONS = [
  { value: "nome", label: "Nome" },
  { value: "tipo", label: "Tipo" },
  { value: "ativo", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

export const FORMA_PAGAMENTO_TIPO_FILTER_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...FORMA_PAGAMENTO_TIPO_OPTIONS,
] as const;

/* ─── Categorias Financeiras ──────────────────────────────────────── */

export const CATEGORIA_FINANCEIRA_TIPO_OPTIONS = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
  { value: "ambos", label: "Ambos" },
] as const;

export const CATEGORIA_FINANCEIRA_SORT_OPTIONS = [
  { value: "nome", label: "Nome" },
  { value: "tipo", label: "Tipo" },
  { value: "ativo", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

export const CATEGORIA_FINANCEIRA_TIPO_FILTER_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...CATEGORIA_FINANCEIRA_TIPO_OPTIONS,
] as const;

/* ─── Contas a Receber ──────────────────────────────────────────────── */

export const CONTA_RECEBER_STATUS_OPTIONS = [
  { value: "aberto", label: "Em aberto" },
  { value: "recebido", label: "Recebido" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const CONTA_RECEBER_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os status" },
  ...CONTA_RECEBER_STATUS_OPTIONS,
] as const;

export const CONTA_RECEBER_SORT_OPTIONS = [
  { value: "numero", label: "Número" },
  { value: "data_vencimento", label: "Vencimento" },
  { value: "data_emissao", label: "Emissão" },
  { value: "valor_original", label: "Valor" },
  { value: "status", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

/* ─── Contas a Pagar ──────────────────────────────────────────────── */

export const CONTAS_PAGAR_SUCCESS_MESSAGES = {
  created: "Conta a pagar cadastrada com sucesso.",
  updated: "Conta a pagar atualizada com sucesso.",
  deleted: "Conta a pagar excluída com sucesso.",
  pago: "Baixa de pagamento registrada com sucesso.",
  cancelado: "Conta a pagar cancelada com sucesso.",
  estornado: "Pagamento estornado com sucesso. Título reaberto.",
} as const;

export const CONTA_PAGAR_STATUS_OPTIONS = [
  { value: "aberto", label: "Em aberto" },
  { value: "parcial", label: "Parcial" },
  { value: "pago", label: "Pago" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const CONTA_PAGAR_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os status" },
  ...CONTA_PAGAR_STATUS_OPTIONS,
] as const;

export const CONTA_PAGAR_SORT_OPTIONS = [
  { value: "numero", label: "Número" },
  { value: "data_vencimento", label: "Vencimento" },
  { value: "data_emissao", label: "Emissão" },
  { value: "data_competencia", label: "Competência" },
  { value: "valor_original", label: "Valor" },
  { value: "status", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

/* ─── Fluxo de Caixa / Movimentações Bancárias ─────────────────────── */

export const MOVIMENTACAO_BANCARIA_TIPO_OPTIONS = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "ajuste", label: "Ajuste" },
  { value: "estorno", label: "Estorno" },
  { value: "transferencia", label: "Transferência" },
] as const;

export const MOVIMENTACAO_BANCARIA_ORIGEM_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "conta_pagar_baixa", label: "Baixa a pagar" },
  { value: "conta_receber_baixa", label: "Baixa a receber" },
  { value: "transferencia", label: "Transferência" },
  { value: "estorno", label: "Estorno" },
  { value: "ajuste", label: "Ajuste" },
] as const;

export const MOVIMENTACAO_BANCARIA_TIPO_FILTER_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...MOVIMENTACAO_BANCARIA_TIPO_OPTIONS,
] as const;

export const MOVIMENTACAO_BANCARIA_ORIGEM_FILTER_OPTIONS = [
  { value: "all", label: "Todas as origens" },
  ...MOVIMENTACAO_BANCARIA_ORIGEM_OPTIONS,
] as const;

export const MOVIMENTACAO_BANCARIA_SORT_OPTIONS = [
  { value: "created_at", label: "Cadastro" },
  { value: "data_movimentacao", label: "Data" },
  { value: "tipo", label: "Tipo" },
  { value: "valor", label: "Valor" },
  { value: "saldo_novo", label: "Saldo após" },
] as const;

export const FLUXO_CAIXA_SUCCESS_MESSAGES = {
  created: "Movimentação bancária registrada com sucesso.",
  deleted: "Movimentação excluída com sucesso.",
  estornado: "Estorno registrado com sucesso.",
  transferencia: "Transferência registrada com sucesso.",
} as const;

export const FINANCEIRO_HUB_ITEMS = [
  {
    title: "Fornecedores",
    description:
      "Cadastro mestre com padrões financeiros para autopreenchimento em Contas a Pagar.",
    href: "fornecedores",
    cta: "Gerenciar fornecedores",
  },
  {
    title: "Plano de Contas",
    description: "Estrutura contábil para classificação de lançamentos.",
    href: "plano-contas",
    cta: "Gerenciar contas",
  },
  {
    title: "Centros de Custo",
    description: "Dimensione despesas e receitas por área ou projeto.",
    href: "centros-custo",
    cta: "Gerenciar centros",
  },
  {
    title: "Contas Bancárias",
    description: "Bancos, caixas e saldos iniciais da operação.",
    href: "contas-bancarias",
    cta: "Gerenciar contas",
  },
  {
    title: "Formas de Pagamento",
    description: "Canais de liquidação com taxas e compensação.",
    href: "formas-pagamento",
    cta: "Gerenciar formas",
  },
  {
    title: "Categorias Financeiras",
    description: "Classificação gerencial de receitas e despesas.",
    href: "categorias",
    cta: "Gerenciar categorias",
  },
  {
    title: "Contas a Receber",
    description: "Recebíveis, parcelas, baixas e vencimentos por cliente.",
    href: "contas-receber",
    cta: "Gerenciar recebíveis",
  },
  {
    title: "Contas a Pagar",
    description: "Obrigações, parcelas, baixas e vencimentos por fornecedor.",
    href: "contas-pagar",
    cta: "Gerenciar pagáveis",
  },
  {
    title: "Despesas Recorrentes",
    description:
      "Séries mensais (aluguel, salários, utilidades) que geram Contas a Pagar.",
    href: "despesas-recorrentes",
    cta: "Gerenciar recorrências",
  },
  {
    title: "Fluxo de Caixa",
    description: "Saldo, entradas, saídas e projeção diária das contas bancárias.",
    href: "fluxo-caixa",
    cta: "Ver fluxo",
  },
  {
    title: "Inteligência Financeira",
    description:
      "Cockpit executivo: KPIs, despesas, tendências e insights sobre o DRE e o Fluxo.",
    href: "inteligencia",
    cta: "Abrir cockpit",
  },
  {
    title: "DRE",
    description:
      "Demonstração do Resultado por competência, com receitas, custos e despesas.",
    href: "dre",
    cta: "Ver DRE",
  },
] as const;

export const FINANCEIRO_ROADMAP_ITEMS = [
  {
    title: "Receita por OS / mecânico / consultor",
    description:
      "Depende de vínculos operacionais ainda não publicados no domínio de vendas.",
    phase: "Backlog",
  },
] as const;