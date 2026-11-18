/**
 * Formato das respostas das rotas de importação de planilha (compartilhado com a tela).
 * Só tipos e funções que montam esses tipos — sem acesso ao banco.
 */
import type { Preparo } from "./preparo.ts";
import type {
  AnalisePlanilha,
  OpcoesImportacao,
  PlanoMes,
  SituacaoCliente,
} from "./tipos.ts";

export type ErroResposta = { ok: false; erro: string };

export type LinhaClientePrevia = {
  nome: string;
  ativo: boolean;
  entrada: string | null;
  saida: string | null;
  mrr: number | null;
  nicho: string | null;
  situacao: SituacaoCliente;
  mudancas: string[];
  avisos: string[];
};

export type TabelaClientesPrevia = {
  aba: string;
  linhaCabecalho: number;
  colunas: Record<string, string>;
  total: number;
  ativos: number;
  churn: number;
  mrrAtivo: number;
  ignoradas: number;
  comAviso: number;
};

export type MesPrevio = PlanoMes & {
  resultado: number;
  resultadoPlanilha: number | null;
  confere: boolean | null;
  /** O usuário marcou este mês para importar. */
  marcado: boolean;
};

export type LayoutPrevio = {
  id: string;
  aba: string;
  formato: "meses-em-colunas" | "blocos-por-mes";
  descricao: string;
  meses: number;
  conferem: number;
  divergem: number;
  avisos: string[];
};

export type ItemPrevio = {
  mes: string;
  tipo: "receita" | "despesa";
  rotulo: string;
  valor: number;
  categoriaNova: boolean;
  linhaDre: string | null;
  acao: "criar" | "atualizar" | "manter";
};

export type CategoriaPrevia = {
  tipo: "receita" | "despesa";
  nome: string;
  linhaDre: string | null;
  motivo: string;
};

export type RespostaAnalise = {
  ok: true;
  nomeArquivo: string;
  abasLidas: AnalisePlanilha["abasLidas"];
  avisos: string[];
  opcoes: OpcoesImportacao;
  clientes: {
    tabelas: TabelaClientesPrevia[];
    resumo: {
      total: number;
      novos: number;
      atualizar: number;
      iguais: number;
      ativos: number;
      churn: number;
      mrrAtivo: number;
    };
    amostra: LinhaClientePrevia[];
    /** `true` quando a lista foi cortada para caber na tela. */
    cortada: boolean;
  };
  dre: {
    layouts: LayoutPrevio[];
    blocos: Array<{ id: string; linha: number; titulo: string; mes: string; deduzidoPor: string }>;
    meses: MesPrevio[];
    itens: ItemPrevio[];
    categoriasNovas: CategoriaPrevia[];
    avisos: string[];
  };
};

export type ResumoImportacao = {
  clientesCriados: number;
  clientesAtualizados: number;
  clientesIguais: number;
  lancamentosCriados: number;
  lancamentosAtualizados: number;
  lancamentosMantidos: number;
  categoriasCriadas: number;
  mesesImportados: string[];
  mesesPulados: Array<{ mes: string; motivo: string }>;
};

export type RespostaImportacao = {
  ok: true;
  resumo: ResumoImportacao;
  avisos: string[];
};

const LIMITE_AMOSTRA_CLIENTES = 400;
const LIMITE_ITENS = 600;

export function montarRespostaAnalise(
  analise: AnalisePlanilha,
  preparo: Preparo,
): RespostaAnalise {
  const planos = preparo.planoClientes;
  const ativos = planos.filter((p) => p.cliente.ativo);
  const mrrAtivo = ativos.reduce((s, p) => s + (p.cliente.mrr ?? 0), 0);

  const tabelas: TabelaClientesPrevia[] = analise.clientes.map((t) => {
    const at = t.clientes.filter((c) => c.ativo);
    return {
      aba: t.aba,
      linhaCabecalho: t.linhaCabecalho,
      colunas: Object.fromEntries(Object.entries(t.colunas).filter(([, v]) => v)) as Record<string, string>,
      total: t.clientes.length,
      ativos: at.length,
      churn: t.clientes.length - at.length,
      mrrAtivo: Math.round(at.reduce((s, c) => s + (c.mrr ?? 0), 0) * 100) / 100,
      ignoradas: t.ignoradas,
      comAviso: t.clientes.filter((c) => c.avisos.length).length,
    };
  });

  // Mostra primeiro o que muda (novos e atualizações) e depois o que já está igual.
  const ordem: Record<SituacaoCliente, number> = { novo: 0, atualizar: 1, igual: 2 };
  const ordenados = [...planos].sort((a, b) => ordem[a.situacao] - ordem[b.situacao]);
  const amostra: LinhaClientePrevia[] = ordenados.slice(0, LIMITE_AMOSTRA_CLIENTES).map((p) => ({
    nome: p.cliente.nome,
    ativo: p.cliente.ativo,
    entrada: p.cliente.entrada,
    saida: p.cliente.saida,
    mrr: p.cliente.mrr,
    nicho: p.cliente.nicho,
    situacao: p.situacao,
    mudancas: p.mudancas,
    avisos: p.cliente.avisos,
  }));

  const layout = preparo.layout;
  const escolhidos = new Set(preparo.opcoes.mesesDre);
  const resumoPorMes = new Map((layout?.meses ?? []).map((m) => [m.mes, m]));
  // Os meses podem ter sido corrigidos pelo usuário (blocos): recalcula pelo que está nos itens.
  const meses: MesPrevio[] = preparo.planoMeses.map((pm) => {
    const original = resumoPorMes.get(pm.mes);
    const resultado = Math.round((pm.receita - pm.despesa) * 100) / 100;
    const resultadoPlanilha = original?.resultadoPlanilha ?? null;
    return {
      ...pm,
      resultado,
      resultadoPlanilha,
      confere:
        resultadoPlanilha == null ? null : Math.abs(resultado - resultadoPlanilha) <= 1,
      marcado: escolhidos.has(pm.mes),
    };
  });

  const itens: ItemPrevio[] = preparo.planoLancamentos.slice(0, LIMITE_ITENS).map((l) => {
    const cat = preparo.categorias.find(
      (c) => c.tipo === l.item.tipo && c.nome === l.item.rotulo,
    );
    return {
      mes: l.item.mes,
      tipo: l.item.tipo,
      rotulo: l.item.rotulo,
      valor: l.item.valor,
      categoriaNova: Boolean(cat?.nova),
      linhaDre: cat?.nova ? cat.nova.dre_linha : null,
      acao: l.acao,
    };
  });

  return {
    ok: true,
    nomeArquivo: analise.nomeArquivo,
    abasLidas: analise.abasLidas,
    avisos: analise.avisos,
    opcoes: preparo.opcoes,
    clientes: {
      tabelas,
      resumo: {
        total: planos.length,
        novos: planos.filter((p) => p.situacao === "novo").length,
        atualizar: planos.filter((p) => p.situacao === "atualizar").length,
        iguais: planos.filter((p) => p.situacao === "igual").length,
        ativos: ativos.length,
        churn: planos.length - ativos.length,
        mrrAtivo: Math.round(mrrAtivo * 100) / 100,
      },
      amostra,
      cortada: planos.length > LIMITE_AMOSTRA_CLIENTES,
    },
    dre: {
      layouts: analise.dre.map((l) => ({
        id: l.id,
        aba: l.aba,
        formato: l.formato,
        descricao: l.descricao,
        meses: l.meses.length,
        conferem: l.meses.filter((m) => m.confere === true).length,
        divergem: l.meses.filter((m) => m.confere === false).length,
        avisos: l.avisos,
      })),
      blocos: (layout?.blocos ?? []).map((b) => ({
        ...b,
        mes: preparo.opcoes.mesesDosBlocos[b.id] ?? b.mes,
      })),
      meses,
      itens,
      categoriasNovas: preparo.categorias
        .filter((c) => c.nova)
        .map((c) => ({
          tipo: c.tipo,
          nome: c.nome,
          linhaDre: c.nova?.dre_linha ?? null,
          motivo: c.nova?.motivo ?? "",
        })),
      avisos: layout?.avisos ?? [],
    },
  };
}
