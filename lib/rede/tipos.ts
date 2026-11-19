/**
 * Rede de lojas — tipos e catálogos compartilhados (sem dependências: roda em
 * Node puro nos testes e no navegador).
 */

export type Status = "ok" | "warn" | "bad" | "neu";
export type Direcao = "min" | "max";
export type FormatoValor = "brl" | "pct0" | "pct1" | "pctS" | "min" | "nota" | "int";

export type IndicadorKey =
  | "fat"
  | "pctMeta"
  | "comp"
  | "cmv"
  | "pessoal"
  | "preparo"
  | "cancel"
  | "ifood"
  | "online"
  | "rupturas"
  | "absent"
  | "turnover";

export type GrupoIndicador = "Comercial" | "Financeiro" | "Delivery e qualidade" | "Pessoas";

export type IndicadorDef = {
  k: IndicadorKey;
  grupo: GrupoIndicador;
  nome: string;
  formato: FormatoValor;
  frequencia: "Diário" | "Semanal" | "Mensal";
  /** Valor calculado a partir de vendas lançadas (não editável à mão). */
  calculado: boolean;
};

/** Mesmas chaves, nomes, grupos e frequências do painel original (HTML Fat Buddha). */
export const INDICADORES: readonly IndicadorDef[] = [
  { k: "fat", grupo: "Comercial", nome: "Faturamento por loja", formato: "brl", frequencia: "Diário", calculado: true },
  { k: "pctMeta", grupo: "Comercial", nome: "Vendas versus meta", formato: "pct0", frequencia: "Diário", calculado: true },
  { k: "comp", grupo: "Comercial", nome: "Comp", formato: "pctS", frequencia: "Semanal", calculado: false },
  { k: "cmv", grupo: "Financeiro", nome: "CMV", formato: "pct1", frequencia: "Semanal", calculado: false },
  { k: "pessoal", grupo: "Financeiro", nome: "Custo de pessoal", formato: "pct1", frequencia: "Mensal", calculado: false },
  { k: "preparo", grupo: "Delivery e qualidade", nome: "Tempo de preparo", formato: "min", frequencia: "Diário", calculado: false },
  { k: "cancel", grupo: "Delivery e qualidade", nome: "Cancelamentos", formato: "pct1", frequencia: "Diário", calculado: false },
  { k: "ifood", grupo: "Delivery e qualidade", nome: "Nota iFood", formato: "nota", frequencia: "Diário", calculado: false },
  { k: "online", grupo: "Delivery e qualidade", nome: "Tempo online", formato: "pct1", frequencia: "Diário", calculado: false },
  { k: "rupturas", grupo: "Delivery e qualidade", nome: "Rupturas por semana", formato: "int", frequencia: "Semanal", calculado: false },
  { k: "absent", grupo: "Pessoas", nome: "Absenteísmo", formato: "pct1", frequencia: "Semanal", calculado: false },
  { k: "turnover", grupo: "Pessoas", nome: "Turnover", formato: "pct1", frequencia: "Mensal", calculado: false },
];

export const GRUPOS: readonly GrupoIndicador[] = ["Comercial", "Financeiro", "Delivery e qualidade", "Pessoas"];

/** Acompanhamentos do plano original que ainda não têm meta numérica. */
export const ACOMPANHAMENTOS_EXTRA: Record<GrupoIndicador, readonly [string, string][]> = {
  Comercial: [
    ["Traffic", "evolução positiva dos pedidos comparáveis"],
    ["Ticket médio e conversão", "evolução positiva"],
  ],
  Financeiro: [
    ["Margem operacional", "por unidade"],
    ["Custo de delivery", "por pedido"],
  ],
  "Delivery e qualidade": [],
  Pessoas: [
    ["Produtividade", "semanal"],
    ["Desenvolvimento dos gestores", "mensal"],
  ],
};

export type ModuloRede =
  | "dashboard"
  | "vendas"
  | "metas"
  | "cmv"
  | "rupturas"
  | "estoque_cc"
  | "delivery"
  | "qualidade"
  | "planos_acao"
  | "dre"
  | "orcamento"
  | "rh_quadro"
  | "rh_movimentos"
  | "rh_ocorrencias"
  | "avaliacao_gerentes"
  | "nine_box"
  | "sucessao"
  | "relatorios"
  | "config";

export type PapelRede =
  | "administrador"
  | "consultor"
  | "diretoria"
  | "gerente_regional"
  | "gerente_loja"
  | "colaborador";

export const PAPEL_LABEL: Record<PapelRede, string> = {
  administrador: "Administrador",
  consultor: "Consultor",
  diretoria: "Diretoria do cliente",
  gerente_regional: "Gerente regional",
  gerente_loja: "Gerente de loja",
  colaborador: "Colaborador autorizado",
};

/** Módulos que um colaborador pode receber (os de lançamento operacional + leitura de painel). */
export const MODULOS_COLABORADOR: readonly { k: ModuloRede; nome: string }[] = [
  { k: "dashboard", nome: "Visão geral" },
  { k: "vendas", nome: "Vendas" },
  { k: "metas", nome: "Metas e indicadores" },
  { k: "cmv", nome: "CMV" },
  { k: "rupturas", nome: "Rupturas" },
  { k: "estoque_cc", nome: "Estoque da cozinha central" },
  { k: "delivery", nome: "Checklist de delivery" },
  { k: "qualidade", nome: "Checklist de qualidade" },
  { k: "planos_acao", nome: "Planos de ação" },
];

export type PerfilRede = {
  papel: PapelRede;
  todasLojas: boolean;
  lojaIds: string[];
  modulos: Partial<Record<ModuloRede, { ver: boolean; editar: boolean }>>;
};

export type StatusLoja = "operando" | "inauguracao" | "inativa";
export type CanaisLoja = "salao+delivery" | "delivery" | "salao";

export type Loja = {
  id: string;
  slug: string;
  nome: string;
  status: StatusLoja;
  canais: CanaisLoja;
  dataInauguracao: string | null;
  inauguracaoPrevista: string | null;
  ordem: number;
};

export type ConfigRede = {
  ambiente: "real" | "demonstracao";
  pisoLoja: number;
  pesosDiaSemana: Record<"seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom", number>;
  toleranciaCmv: number;
  toleranciaSemaforoPct: number;
};

export type MetaRow = {
  id: string;
  lojaId: string | null;
  indicador: IndicadorKey;
  meta: number | null;
  direcao: Direcao | null;
  validoDe: string;
  validoAte: string | null;
};

export type VendaDia = {
  lojaId: string;
  data: string;
  salao: number;
  delivery: number;
  pedidosSalao: number;
  pedidosDelivery: number;
};

export type VendaHoraMes = {
  lojaId: string;
  mes: string;
  hora: number;
  salao: number;
  delivery: number;
};

export type IndicadorMes = {
  lojaId: string;
  mes: string;
  indicador: IndicadorKey;
  valor: number;
  /** "calculado" = vindo de um módulo de origem (ex.: contagens de CMV); nunca gravado nesta tabela. */
  origem: "manual" | "exemplo" | "calculado";
};

export type MetaFaturamento = { lojaId: string; mes: string; valor: number };


/* ------------------------------------------------------------------ rodada 15: CMV, DRE, orçamento */

export type OrigemRegistro = "manual" | "exemplo";

/** Contagem semanal de estoque de uma loja (semana começa na segunda). */
export type CmvSemana = {
  id: string;
  lojaId: string;
  semana: string;
  /** null = usa a soma das vendas lançadas no módulo Vendas na semana. */
  vendas: number | null;
  cmvTeorico: number;
  estoqueInicial: number;
  compras: number;
  transferenciasEntrada: number;
  transferenciasSaida: number;
  devolucoes: number;
  estoqueFinal: number;
  responsavel: string | null;
  observacoes: string | null;
  origem: OrigemRegistro;
};

export type CmvItem = { lojaId: string; semana: string; item: string; consumoTeorico: number; consumoReal: number };

/** Linhas do DRE que aceitam lançamento real (em R$) no mês. */
export type LinhaDreKey = "impostos" | "cmv" | "folha" | "delivery" | "manutencao" | "marketing" | "cto" | "agua" | "energia";

export const LINHAS_DRE_LANCAVEIS: readonly { k: LinhaDreKey; nome: string }[] = [
  { k: "impostos", nome: "Impostos" },
  { k: "cmv", nome: "CMV" },
  { k: "folha", nome: "Folha de pagamento" },
  { k: "delivery", nome: "Custos de delivery" },
  { k: "manutencao", nome: "Manutenção" },
  { k: "marketing", nome: "Marketing, royalties, escritório e fundo de propaganda" },
  { k: "cto", nome: "CTO (custo total de ocupação)" },
  { k: "agua", nome: "Água" },
  { k: "energia", nome: "Energia" },
];

export type BaseDelivery = "delivery" | "total";

/** Premissas do DRE de uma loja (percentuais sobre o faturamento bruto; CTO, água e energia em R$). */
export type PremissasDre = {
  cmv: number;
  pessoal: number;
  impostos: number;
  custoDelivery: number;
  baseDelivery: BaseDelivery;
  manutencao: number;
  marketing: number;
  cto: number;
  agua: number;
  energia: number;
  /** Participação do delivery no faturamento orçado (%). */
  mixDelivery: number;
};

/** Linha de premissa: lojaId nulo = padrão da rede; senão, só os campos preenchidos substituem o padrão. */
export type PremissasDreRow = { lojaId: string | null } & Partial<PremissasDre>;

export type LancamentoDre = {
  id: string;
  lojaId: string;
  mes: string;
  linha: LinhaDreKey;
  valor: number;
  observacao: string | null;
  origem: OrigemRegistro;
};

/** Cenário de orçamento de nova loja. */
export type Cenario = {
  id: string;
  nome: string;
  descricao: string | null;
  faturamento: number;
  mixDelivery: number;
  cmv: number;
  folha: number;
  impostos: number;
  custoDelivery: number;
  baseDelivery: BaseDelivery;
  manutencao: number;
  marketing: number;
  cto: number;
  agua: number;
  energia: number;
  curva: number[];
  padrao: boolean;
  origem: OrigemRegistro;
};

export type StatusUnidade = "planejada" | "inaugurada" | "cancelada";

export type UnidadeExpansao = {
  id: string;
  nome: string;
  /** Primeiro dia do mês previsto de abertura (YYYY-MM-01) ou null. */
  aberturaPrevista: string | null;
  status: StatusUnidade;
  cenarioId: string | null;
  lojaId: string | null;
  faturamentoAlvo: number | null;
  observacao: string | null;
  origem: OrigemRegistro;
};

export type ConfigExpansao = {
  metaLojas: number;
  faturamentoMinimo: number;
  lojasBase: string[];
};

/* ------------------------------------------------------------------ rodada 16: cozinha central e delivery */

export const MOTIVOS_RUPTURA = [
  "Falta na cozinha central",
  "Atraso na entrega",
  "Erro no pedido da loja",
  "Problema de qualidade",
  "Demanda acima do previsto",
] as const;
export type MotivoRuptura = (typeof MOTIVOS_RUPTURA)[number];

export type Ruptura = {
  id: string;
  lojaId: string;
  data: string;
  item: string;
  motivo: MotivoRuptura;
  /** Horas em que o item ficou indisponível. */
  horas: number;
  acao: string | null;
  origem: "manual" | "exemplo";
};

export type ProdutoCC = {
  id: string;
  item: string;
  unidade: string;
  atual: number;
  minimo: number;
  consumoDia: number;
  custo: number;
  origem: "manual" | "exemplo";
};

export type PeriodoDelivery = "diario" | "semanal";
export type RespostaRotina = "sim" | "nao" | "na";

export type RegistroDelivery = {
  id: string;
  lojaId: string;
  /** Diário: o dia. Semanal: a segunda-feira da semana. */
  data: string;
  periodo: PeriodoDelivery;
  responsavel: string | null;
  preparo: number | null;
  cancelamentos: number | null;
  notaIfood: number | null;
  tempoOnline: number | null;
  rupturas: number | null;
  pedidos: number | null;
  ticketMedio: number | null;
  conversao: number | null;
  atrasos: number | null;
  comissoes: number | null;
  freteSubsidiado: number | null;
  promocoes: number | null;
  custoPedido: number | null;
  /** Resposta de cada item da rotina (índice 0 a 6); item sem resposta = ausente. */
  rotina: Record<number, RespostaRotina>;
  observacoes: string | null;
  origem: "manual" | "exemplo";
};

/* ------------------------------------------------------------------ checklist de qualidade e planos de ação (rodada 17) */

export type RespostaQualidade = "sim" | "nao" | "na";
/** Resposta de um item da visita: Sim/Não/N/A e a evidência (observação) opcional. */
export type RespostaItemQualidade = { v: RespostaQualidade | null; o: string | null };
/** Chave "<seção>-<item>" (ambos a partir de 0), como no painel original. */
export type RespostasQualidade = Record<string, RespostaItemQualidade>;

export type VisitaQualidade = {
  id: string;
  lojaId: string;
  data: string;
  avaliador: string;
  gerente: string | null;
  respostas: RespostasQualidade;
  origem: "manual" | "exemplo";
  criadaEm: string;
};

export type OrigemPlano = "qualidade" | "delivery" | "indicador" | "manual";
export type StatusPlano = "pendente" | "em_andamento" | "concluido" | "cancelado";
export type PrioridadePlano = "baixa" | "media" | "alta";

export type PlanoAcao = {
  id: string;
  lojaId: string;
  origemTipo: OrigemPlano;
  /** Registro de origem (visita ou checklist); null quando é manual ou o registro foi excluído. */
  origemId: string | null;
  /** Item do registro de origem (ex.: "0-1" na visita, "rotina-2" no delivery). */
  origemRef: string | null;
  origemRotulo: string;
  descricao: string;
  acao: string | null;
  responsavel: string | null;
  prazo: string | null;
  prioridade: PrioridadePlano;
  status: StatusPlano;
  dataConclusao: string | null;
  evidencia: string | null;
  observacoes: string | null;
  verificadoEm: string | null;
  criadoEm: string;
};

/* ------------------------------------------------------------------ RH (rodada 18) */

export type CargoRh = "gerente_loja" | "chefe_cozinha" | "lider_delivery" | "auxiliar_cozinha" | "atendente";
export type StatusColaborador = "ativo" | "desligado";

export type ColaboradorRh = {
  id: string;
  lojaId: string;
  nome: string;
  cargo: CargoRh;
  /** AAAA-MM-DD. */
  dataAdmissao: string;
  status: StatusColaborador;
  dataDesligamento: string | null;
  motivoDesligamento: string | null;
  observacoes: string | null;
  origem: "manual" | "exemplo";
};

export type PrevistoRh = { lojaId: string; cargo: CargoRh; previsto: number; origem: "manual" | "exemplo" };

/** Lançamento mensal de uma loja. Turnover e absenteísmo NÃO são gravados: saem destas contagens. */
export type MesRh = {
  id: string;
  lojaId: string;
  /** Primeiro dia do mês (AAAA-MM-01). */
  mes: string;
  headcount: number;
  admissoes: number;
  desligamentos: number;
  faltas: number;
  diasPrevistos: number;
  origem: "manual" | "exemplo";
};

export type TipoOcorrencia =
  | "advertencia_verbal"
  | "advertencia_escrita"
  | "suspensao"
  | "falta_injustificada"
  | "atraso"
  | "atestado_medico"
  | "feedback"
  | "elogio"
  | "treinamento"
  | "desligamento";
export type StatusOcorrencia = "registrada" | "aguardando_assinatura" | "assinada" | "recusou_assinar" | "concluida";

export type OcorrenciaRh = {
  id: string;
  lojaId: string;
  colaboradorId: string;
  tipo: TipoOcorrencia;
  data: string;
  status: StatusOcorrencia;
  motivo: string;
  responsavel: string | null;
  observacoes: string | null;
  origem: "manual" | "exemplo";
};
