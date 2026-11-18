/**
 * Importador de planilha de gestão (agências, consultórios, clínicas e outros negócios de
 * serviço): tipos compartilhados entre o leitor da planilha, o plano de importação e a tela.
 * Sem I/O e sem dependências do Next — roda também nos testes (node --experimental-strip-types).
 */

/** Uma aba da planilha como matriz de células (linha × coluna), do jeito que o arquivo guarda. */
export type Aba = {
  nome: string;
  /** Linha da planilha (1 = primeira) onde a matriz começa. */
  linhaInicial: number;
  /** Coluna da planilha (0 = A) onde a matriz começa. */
  colunaInicial: number;
  oculta: boolean;
  linhas: unknown[][];
};

export type Planilha = {
  nomeArquivo: string;
  abas: Aba[];
};

/* ------------------------------------------------------------------ clientes */

export type CampoCliente =
  | "nome"
  | "nicho"
  | "status"
  | "entrada"
  | "saida"
  | "mrr"
  | "meses"
  | "faturamento"
  | "motivo"
  | "gestor";

export const ROTULO_CAMPO_CLIENTE: Record<CampoCliente, string> = {
  nome: "Nome do cliente",
  nicho: "Nicho / segmento",
  status: "Status",
  entrada: "Data de entrada",
  saida: "Data de saída",
  mrr: "Valor mensal (MRR)",
  meses: "Meses ativos",
  faturamento: "Faturamento gerado",
  motivo: "Motivo da saída",
  gestor: "Responsável / gestor",
};

export type ClientePlanilha = {
  /** Chave de conciliação: NOME|data de entrada (maiúsculas, sem acento). */
  chave: string;
  nome: string;
  nicho: string | null;
  ativo: boolean;
  entrada: string | null;
  saida: string | null;
  mrr: number | null;
  meses: number | null;
  faturamento: number | null;
  motivo: string | null;
  gestor: string | null;
  aba: string;
  linha: number;
  avisos: string[];
};

export type TabelaClientes = {
  aba: string;
  /** Linha da planilha onde está o cabeçalho (a primeira tabela da aba). */
  linhaCabecalho: number;
  /** Coluna da planilha (A, B, …) lida para cada campo. */
  colunas: Partial<Record<CampoCliente, string>>;
  clientes: ClientePlanilha[];
  ignoradas: number;
};

/* ------------------------------------------------------------------------ DRE */

export type TipoLancamento = "receita" | "despesa";

export type ItemDre = {
  /** Mês de competência (AAAA-MM). */
  mes: string;
  tipo: TipoLancamento;
  rotulo: string;
  valor: number;
  /** Linha da planilha onde o item está. */
  linha: number;
  /** Como o tipo foi decidido: pelo título da seção ou pelo nome da linha. */
  origemTipo: "secao" | "nome";
  /** Para blocos por mês: a que bloco o item pertence (permite corrigir o mês na tela). */
  blocoId?: string;
};

export type ResumoMesDre = {
  mes: string;
  receita: number;
  despesa: number;
  resultado: number;
  /** Resultado que a própria planilha mostra (quando existe uma linha de resultado). */
  resultadoPlanilha: number | null;
  /** `true` quando o resultado calculado bate com o da planilha (±R$ 1). */
  confere: boolean | null;
  itens: number;
};

export type LayoutDre = {
  /** Identificador estável da opção (aba + formato), usado na escolha da tela. */
  id: string;
  aba: string;
  formato: "meses-em-colunas" | "blocos-por-mes";
  descricao: string;
  /** Para blocos: de onde o mês foi deduzido (editável na tela). */
  blocos: Array<{ id: string; linha: number; titulo: string; mes: string; deduzidoPor: string }>;
  meses: ResumoMesDre[];
  itens: ItemDre[];
  avisos: string[];
};

/* --------------------------------------------------------------------- análise */

export type AnalisePlanilha = {
  nomeArquivo: string;
  abasLidas: Array<{ nome: string; linhas: number; oculta: boolean }>;
  clientes: TabelaClientes[];
  dre: LayoutDre[];
  avisos: string[];
};

/** Escolhas feitas na tela antes de gravar. */
export type OpcoesImportacao = {
  /** Abas de clientes a importar (vazio = não importar clientes). */
  abasClientes: string[];
  /** Layout de DRE escolhido (`LayoutDre.id`) ou `null` para não importar o financeiro. */
  layoutDre: string | null;
  /** Meses a importar (AAAA-MM). Meses fora da lista são ignorados. */
  mesesDre: string[];
  /** Para blocos por mês: correção manual do mês de cada bloco (`id` do bloco → AAAA-MM). */
  mesesDosBlocos: Record<string, string>;
  /** Meses que já têm lançamentos e que o usuário aceitou somar mesmo assim. */
  mesesSobrepostos: string[];
};

/* ------------------------------------------------------------- plano x banco */

export type ClienteExistente = {
  id: string;
  nome: string;
  data_referencia: string | null;
  ativo: boolean | null;
  data_fechamento: string | null;
  valor_estimado: number | null;
  motivo_perda: string | null;
  segmento: string | null;
  observacoes: string | null;
};

export type SituacaoCliente = "novo" | "atualizar" | "igual";

export type PlanoCliente = {
  cliente: ClientePlanilha;
  situacao: SituacaoCliente;
  existenteId: string | null;
  /** Campos que mudam quando já existe. */
  mudancas: string[];
};

export type LancamentoExistente = {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  /** AAAA-MM da competência. */
  mes: string;
  valor: number;
  chave: string | null;
};

export type SituacaoMes = "novo" | "atualiza" | "igual" | "ocupado";

export type PlanoMes = {
  mes: string;
  situacao: SituacaoMes;
  /** Lançamentos que serão criados / atualizados / mantidos. */
  criar: number;
  atualizar: number;
  manter: number;
  /** Lançamentos que já existiam no mês e não vieram da planilha. */
  existentesDeOutraOrigem: number;
  receita: number;
  despesa: number;
};

export type PlanoLancamento = {
  item: ItemDre;
  chave: string;
  acao: "criar" | "atualizar" | "manter";
  existenteId: string | null;
};
