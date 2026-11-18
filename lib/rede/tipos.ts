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
  origem: "manual" | "exemplo";
};

export type MetaFaturamento = { lojaId: string; mes: string; valor: number };
