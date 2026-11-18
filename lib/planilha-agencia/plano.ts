/**
 * Plano de importação: compara o que veio da planilha com o que já existe no portal e diz, item a
 * item, o que será criado, atualizado ou mantido. Função pura — quem lê e grava no banco é o
 * `persistir.ts`.
 */
import { arredonda2, pad2, sem } from "./texto.ts";
import type {
  ClienteExistente,
  ClientePlanilha,
  ItemDre,
  LancamentoExistente,
  PlanoCliente,
  PlanoLancamento,
  PlanoMes,
} from "./tipos.ts";

/* ------------------------------------------------------------------ clientes */

export function chaveDoCliente(nome: string, entrada: string | null): string {
  return `${sem(nome)}|${entrada ?? ""}`;
}

export function estagioDoCliente(ativo: boolean): "fechado" | "perdido" {
  return ativo ? "fechado" : "perdido";
}

function igual(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.005;
}

export function planejarClientes(
  clientes: ClientePlanilha[],
  existentes: ClienteExistente[],
): PlanoCliente[] {
  const porChave = new Map<string, ClienteExistente>();
  for (const e of existentes) {
    const k = chaveDoCliente(e.nome, e.data_referencia);
    if (!porChave.has(k)) porChave.set(k, e);
  }

  return clientes.map((c) => {
    const e = porChave.get(chaveDoCliente(c.nome, c.entrada));
    if (!e) return { cliente: c, situacao: "novo", existenteId: null, mudancas: [] };

    const mudancas: string[] = [];
    if (Boolean(e.ativo) !== c.ativo) mudancas.push(c.ativo ? "voltou a ser ativo" : "passou a churn");
    if (!c.ativo && c.saida && e.data_fechamento !== c.saida) mudancas.push("data de saída");
    if (c.mrr != null && !igual(e.valor_estimado, c.mrr)) mudancas.push("valor mensal");
    if (!c.ativo && c.motivo && (e.motivo_perda ?? "") !== c.motivo) mudancas.push("motivo da saída");
    if (c.nicho && !e.segmento) mudancas.push("nicho");

    return {
      cliente: c,
      situacao: mudancas.length ? "atualizar" : "igual",
      existenteId: e.id,
      mudancas,
    };
  });
}

/** Texto das observações do cliente importado (no formato que o painel já sabe ler). */
export function observacaoDoCliente(c: ClientePlanilha, nomeArquivo: string): string {
  const partes = [
    `Importado da planilha ${nomeArquivo} (aba ${c.aba}, linha ${c.linha}).`,
    `Status: ${c.ativo ? "ATIVO" : "CHURN"}.`,
  ];
  if (c.meses != null) partes.push(`Meses ativos: ${c.meses}.`);
  if (c.faturamento != null) partes.push(`Faturamento gerado: R$ ${c.faturamento}.`);
  if (c.gestor) partes.push(`Gestor(es): ${c.gestor.replace(/\./g, "")}.`);
  return partes.join(" ");
}

/* ------------------------------------------------------------------ lançamentos */

export function chaveDoLancamento(item: Pick<ItemDre, "mes" | "tipo" | "rotulo">): string {
  return `dre|${item.mes}|${item.tipo}|${sem(item.rotulo)}`;
}

export function descricaoDoLancamento(item: Pick<ItemDre, "mes" | "rotulo">): string {
  return `${item.rotulo} — ${item.mes.slice(5, 7)}/${item.mes.slice(0, 4)}`;
}

export const MARCA_CHAVE = "[chave:";

export function observacaoDoLancamento(
  item: ItemDre,
  nomeArquivo: string,
  aba: string,
): string {
  return `Importado da planilha ${nomeArquivo} (aba ${aba}, linha ${item.linha}), valor consolidado do mês. ${MARCA_CHAVE}${chaveDoLancamento(item)}]`;
}

export function extrairChave(observacoes: string | null | undefined): string | null {
  if (!observacoes) return null;
  const i = observacoes.indexOf(MARCA_CHAVE);
  if (i < 0) return null;
  const fim = observacoes.indexOf("]", i);
  if (fim < 0) return null;
  return observacoes.slice(i + MARCA_CHAVE.length, fim);
}

/** Troca o mês dos itens de blocos quando o usuário corrigiu o mês na tela. */
export function aplicarMesesDosBlocos(
  itens: ItemDre[],
  mesesDosBlocos: Record<string, string>,
): ItemDre[] {
  return itens.map((it) => {
    const novo = it.blocoId ? mesesDosBlocos[it.blocoId] : undefined;
    return novo && /^\d{4}-(0[1-9]|1[0-2])$/.test(novo) ? { ...it, mes: novo } : it;
  });
}

/** Soma itens que passaram a cair no mesmo mês/linha depois da correção manual dos meses. */
export function juntarItens(itens: ItemDre[]): ItemDre[] {
  const mapa = new Map<string, ItemDre>();
  for (const it of itens) {
    const k = chaveDoLancamento(it);
    const atual = mapa.get(k);
    if (atual) atual.valor = arredonda2(atual.valor + it.valor);
    else mapa.set(k, { ...it });
  }
  return [...mapa.values()];
}

export function planejarLancamentos(
  itens: ItemDre[],
  existentes: LancamentoExistente[],
  mesesSobrepostos: string[],
): { lancamentos: PlanoLancamento[]; meses: PlanoMes[] } {
  const porChave = new Map<string, LancamentoExistente>();
  const outraOrigemPorMes = new Map<string, number>();
  for (const e of existentes) {
    if (e.chave) porChave.set(e.chave, e);
    else outraOrigemPorMes.set(e.mes, (outraOrigemPorMes.get(e.mes) ?? 0) + 1);
  }
  const aceitos = new Set(mesesSobrepostos);

  const nomesDosMeses = [...new Set(itens.map((i) => i.mes))].sort();
  const lancamentos: PlanoLancamento[] = [];
  const meses: PlanoMes[] = [];

  for (const mes of nomesDosMeses) {
    const doMes = itens.filter((i) => i.mes === mes);
    const outras = outraOrigemPorMes.get(mes) ?? 0;
    const ocupado = outras > 0 && !aceitos.has(mes);
    const resumo: PlanoMes = {
      mes,
      situacao: "novo",
      criar: 0,
      atualizar: 0,
      manter: 0,
      existentesDeOutraOrigem: outras,
      receita: arredonda2(doMes.filter((i) => i.tipo === "receita").reduce((s, i) => s + i.valor, 0)),
      despesa: arredonda2(doMes.filter((i) => i.tipo === "despesa").reduce((s, i) => s + i.valor, 0)),
    };

    if (ocupado) {
      resumo.situacao = "ocupado";
      meses.push(resumo);
      continue;
    }

    for (const item of doMes) {
      const chave = chaveDoLancamento(item);
      const e = porChave.get(chave);
      if (!e) {
        lancamentos.push({ item, chave, acao: "criar", existenteId: null });
        resumo.criar++;
      } else if (Math.abs(e.valor - item.valor) < 0.005) {
        lancamentos.push({ item, chave, acao: "manter", existenteId: e.id });
        resumo.manter++;
      } else {
        lancamentos.push({ item, chave, acao: "atualizar", existenteId: e.id });
        resumo.atualizar++;
      }
    }
    resumo.situacao =
      resumo.atualizar > 0 || (resumo.criar > 0 && resumo.manter > 0)
        ? "atualiza"
        : resumo.criar > 0
          ? "novo"
          : "igual";
    meses.push(resumo);
  }
  return { lancamentos, meses };
}

export function rotuloDoMes(mes: string): string {
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
}

export function primeiroDiaDoMes(mes: string): string {
  return `${mes}-${pad2(1)}`;
}
