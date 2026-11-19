/**
 * Rede de lojas — peças comuns das ações de gravação: leitura validada da entrada, tradução de erros do banco
 * e os formatos básicos (identificador, data, mês, dinheiro). Puro (sem "use server"): os testes importam direto.
 */
import { z } from "zod";

import { dataValida } from "./filtros.ts";

export const nomeCampo: Record<string, string> = {
  lojaId: "loja",
  data: "data",
  salao: "venda do salão",
  delivery: "venda do delivery",
  pedidosSalao: "pedidos do salão",
  pedidosDelivery: "pedidos do delivery",
  mes: "mês",
  valor: "valor",
  meta: "meta",
  direcao: "direção",
  indicador: "indicador",
  vigencia: "vigência",
  nome: "nome",
  slug: "identificador",
  status: "situação",
  canais: "canais",
  papel: "perfil",
  userId: "usuário",
  pisoLoja: "piso por loja",
  pesos: "pesos por dia da semana",
  toleranciaCmv: "tolerância do CMV",
  toleranciaSemaforoPct: "tolerância do semáforo",
  // rodada 15
  semana: "semana",
  vendas: "vendas da semana",
  cmvTeorico: "CMV teórico",
  estoqueInicial: "estoque inicial",
  compras: "compras",
  transferenciasEntrada: "transferências de entrada",
  transferenciasSaida: "transferências de saída",
  devolucoes: "devoluções",
  estoqueFinal: "estoque final",
  responsavel: "responsável",
  observacoes: "observações",
  observacao: "observação",
  itens: "itens da contagem",
  item: "item",
  consumoTeorico: "consumo teórico",
  consumoReal: "consumo real",
  linha: "linha do DRE",
  impostos: "impostos",
  cmv: "CMV",
  pessoal: "pessoal",
  folha: "folha",
  custoDelivery: "custo de delivery",
  baseDelivery: "base do custo de delivery",
  manutencao: "manutenção",
  marketing: "marketing",
  cto: "CTO",
  agua: "água",
  energia: "energia",
  mixDelivery: "participação do delivery",
  faturamento: "faturamento",
  curva: "curva de maturação",
  descricao: "descrição",
  cenarioId: "cenário",
  aberturaPrevista: "abertura prevista",
  faturamentoAlvo: "faturamento-alvo",
  metaLojas: "meta de lojas",
  faturamentoMinimo: "faturamento mínimo",
  lojasBase: "lojas-base",
  campos: "premissas",
  // rodada 16
  motivo: "motivo",
  horas: "horas de indisponibilidade",
  acao: "ação corretiva",
  unidade: "unidade",
  atual: "estoque atual",
  minimo: "estoque mínimo",
  consumoDia: "consumo diário",
  custo: "custo unitário",
  periodo: "período",
  preparo: "tempo de preparo",
  cancelamentos: "cancelamentos",
  notaIfood: "nota iFood",
  tempoOnline: "tempo online",
  rupturas: "rupturas",
  pedidos: "pedidos",
  ticketMedio: "ticket médio",
  conversao: "conversão",
  atrasos: "atrasos",
  comissoes: "comissões e taxas",
  freteSubsidiado: "frete subsidiado",
  promocoes: "promoções e descontos",
  custoPedido: "custo por pedido",
  rotina: "rotina de delivery",
  indicadores: "indicadores com meta",
  // rodada 17
  avaliador: "avaliador",
  gerente: "gerente",
  respostas: "respostas da visita",
  acoes: "ações dos desvios",
  prazo: "prazo",
  prioridade: "prioridade",
  evidencia: "evidência",
  origemTipo: "origem",
  origemRotulo: "origem",
  o: "observação do item",
  v: "resposta do item",
};

export function lerEntrada<T>(schema: z.ZodType<T>, entrada: unknown): T {
  const r = schema.safeParse(entrada);
  if (r.success) return r.data;
  const p = r.error.issues[0];
  // Em campos aninhados (premissas.cmv, itens.2.consumoReal) vale o nome mais específico que tem tradução.
  const chaves = (p?.path ?? []).filter((k): k is string => typeof k === "string");
  const chave = [...chaves].reverse().find((k) => nomeCampo[k]) ?? chaves[0] ?? "dados";
  const campo = nomeCampo[chave] ?? chave;
  const motivo = p?.message && /^[A-ZÀ-Ú]/.test(p.message) && !/^Invalid/i.test(p.message) ? p.message.replace(/\.$/, "") : "valor inválido";
  throw new Error(`Confira o campo "${campo}": ${motivo}.`);
}

export function traduzir(error: unknown, padrao: string): string {
  if (error instanceof Error && !("code" in error)) return error.message;
  const e = error as { code?: string; message?: string };
  if (e?.code === "42501" || /row-level security/i.test(e?.message ?? "")) return "Você não tem permissão para esta operação.";
  if (e?.code === "23505") return "Já existe um registro com esses dados.";
  if (e?.code === "23503") return "Registro relacionado não encontrado.";
  if (e?.code === "23514") return e?.message && /^[A-ZÀ-Ú][^{}]*\.$/.test(e.message) && !/violates/i.test(e.message) ? e.message : "Algum valor está fora do permitido.";
  if (e?.message && !/[{}]|select|insert|violates/i.test(e.message)) return e.message;
  return padrao;
}

export const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Identificador inválido.");
export const data = z.string().refine(dataValida, "Data inválida.");
export const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido.");
export const dinheiro = z.number({ message: "Informe um número." }).min(0, "Não pode ser negativo.").max(100_000_000, "Valor acima do limite.");
export const inteiro = z.number({ message: "Informe um número." }).int("Deve ser inteiro.").min(0, "Não pode ser negativo.").max(1_000_000, "Valor acima do limite.");
export const percentual = z.number({ message: "Informe um número." }).min(0, "Não pode ser negativo.").max(100, "No máximo 100%.");
