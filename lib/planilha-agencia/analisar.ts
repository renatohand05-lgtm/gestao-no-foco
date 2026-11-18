/**
 * Junta tudo: lê as abas, acha a base de clientes e as DREs possíveis e sugere o que importar.
 * Função pura — não acessa o banco.
 */
import { lerClientesDaAba, pontuarTabelaClientes } from "./clientes.ts";
import { lerDreDaAba, pontuarLayoutDre } from "./dre.ts";
import type {
  AnalisePlanilha,
  LayoutDre,
  OpcoesImportacao,
  Planilha,
  TabelaClientes,
} from "./tipos.ts";

export type Hoje = { ano: number; mes: number };

export function analisarPlanilha(planilha: Planilha, hoje: Hoje): AnalisePlanilha {
  const avisos: string[] = [];
  const tabelas: Array<{ t: TabelaClientes; nota: number }> = [];
  const layouts: LayoutDre[] = [];

  for (const aba of planilha.abas) {
    const t = lerClientesDaAba(aba);
    if (t) tabelas.push({ t, nota: pontuarTabelaClientes(t, aba.oculta) });
    for (const l of lerDreDaAba(aba, hoje)) layouts.push(l);
  }

  const ocultas = new Set(planilha.abas.filter((a) => a.oculta).map((a) => a.nome));
  tabelas.sort((a, b) => b.nota - a.nota);
  layouts.sort((a, b) => pontuarLayoutDre(b) - pontuarLayoutDre(a));

  // Abas escondidas só entram se não houver nada nas abas visíveis.
  const tabelasVisiveis = tabelas.filter((x) => !ocultas.has(x.t.aba) && x.t.clientes.length >= 3);
  const layoutsVisiveis = layouts.filter((l) => !ocultas.has(l.aba));
  const tabelasFinais = tabelasVisiveis.length ? tabelasVisiveis : tabelas;
  const layoutsFinais = layoutsVisiveis.length ? layoutsVisiveis : layouts;

  if (!tabelasFinais.length) {
    avisos.push(
      "Não encontrei uma lista de clientes. Ela precisa ter um cabeçalho com o nome do cliente e pelo menos duas destas colunas: data de entrada, status, valor mensal, data de saída, nicho.",
    );
  }
  if (!layoutsFinais.length) {
    avisos.push(
      "Não encontrei uma DRE (receitas e despesas por mês). Ela precisa ter os meses em colunas ou um bloco por mês, com as contas de receita e de despesa.",
    );
  }

  return {
    nomeArquivo: planilha.nomeArquivo,
    abasLidas: planilha.abas.map((a) => ({
      nome: a.nome,
      linhas: a.linhas.length,
      oculta: a.oculta,
    })),
    clientes: tabelasFinais.slice(0, 4).map((x) => x.t),
    dre: layoutsFinais.slice(0, 4),
    avisos,
  };
}

/** O que importar por padrão: a melhor lista de clientes e a DRE que mais "fecha" com a planilha. */
export function sugerirOpcoes(analise: AnalisePlanilha): OpcoesImportacao {
  const melhorDre = analise.dre[0] ?? null;
  return {
    abasClientes: analise.clientes[0] ? [analise.clientes[0].aba] : [],
    layoutDre: melhorDre ? melhorDre.id : null,
    mesesDre: melhorDre ? melhorDre.meses.map((m) => m.mes) : [],
    mesesDosBlocos: {},
    mesesSobrepostos: [],
  };
}
