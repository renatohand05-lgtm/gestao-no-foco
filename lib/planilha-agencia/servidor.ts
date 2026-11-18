/**
 * Lado do servidor da importação de planilha: lê o que já existe no banco, monta a prévia e grava.
 * Usa o cliente Supabase da pessoa logada, então as regras de acesso (RLS) valem normalmente.
 */
import { suggestDreClassificationFromName } from "@/lib/dre/dre-category-mapping";

import { analisarPlanilha, type Hoje } from "./analisar";
import type { SugestaoPorNome } from "./categorias";
import { lerPlanilha } from "./leitor";
import {
  intervaloDeMeses,
  itensDoLayout,
  juntarOpcoes,
  montarPreparo,
  type Existentes,
  type Preparo,
} from "./preparo";
import { estagioDoCliente, extrairChave, observacaoDoCliente, observacaoDoLancamento, descricaoDoLancamento } from "./plano";
import type { ResumoImportacao } from "./respostas";
import { sem, ultimoDiaDoMes } from "./texto";
import type {
  AnalisePlanilha,
  ClienteExistente,
  LancamentoExistente,
  OpcoesImportacao,
} from "./tipos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = { from: (tabela: string) => any };

const TAMANHO_PAGINA = 1000;
const TAMANHO_LOTE = 200;
const NOME_CLIENTE_TECNICO = "Receitas consolidadas (planilha)";
const ORIGEM_CLIENTES = "Importação de planilha";

export const sugerirPorNome: SugestaoPorNome = (nome) => {
  const s = suggestDreClassificationFromName(nome);
  return s ? { linha: s.linha, detalhe: s.detalhe } : null;
};

export function hojeEmSaoPaulo(agora = new Date()): Hoje {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(agora);
  return { ano: Number(partes.slice(0, 4)), mes: Number(partes.slice(5, 7)) };
}

function lotes<T>(lista: T[], tamanho = TAMANHO_LOTE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) out.push(lista.slice(i, i + tamanho));
  return out;
}

async function buscarTudo<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await consulta(de, de + TAMANHO_PAGINA - 1);
    if (error) throw new Error(error.message);
    const pagina = (data ?? []) as T[];
    out.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) break;
  }
  return out;
}

export async function carregarExistentes(
  db: Db,
  tenantId: string,
  intervalo: { de: string; ate: string } | null,
): Promise<Existentes> {
  const clientes = await buscarTudo<ClienteExistente>((de, ate) =>
    db
      .from("clientes")
      .select(
        "id, nome, data_referencia, ativo, data_fechamento, valor_estimado, motivo_perda, segmento, observacoes",
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("id")
      .range(de, ate),
  );

  const categorias = await buscarTudo<Existentes["categorias"][number]>((de, ate) =>
    db
      .from("categorias_financeiras")
      .select("id, nome, tipo, dre_linha")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("id")
      .range(de, ate),
  );

  const lancamentos: LancamentoExistente[] = [];
  if (intervalo) {
    const inicio = `${intervalo.de}-01`;
    const fim = ultimoDiaDoMes(intervalo.ate);

    type LinhaPagar = {
      id: string;
      descricao: string;
      valor_original: number;
      data_competencia: string | null;
      data_emissao: string | null;
      observacoes: string | null;
    };
    const pagar = await buscarTudo<LinhaPagar>((de, ate) =>
      db
        .from("contas_pagar")
        .select("id, descricao, valor_original, data_competencia, data_emissao, observacoes")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .neq("status", "cancelado")
        .gte("data_competencia", inicio)
        .lte("data_competencia", fim)
        .order("id")
        .range(de, ate),
    );
    const receber = await buscarTudo<LinhaPagar>((de, ate) =>
      db
        .from("contas_receber")
        .select("id, descricao, valor_original, data_competencia, data_emissao, observacoes")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .neq("status", "cancelado")
        .or(
          `and(data_competencia.gte.${inicio},data_competencia.lte.${fim}),and(data_competencia.is.null,data_emissao.gte.${inicio},data_emissao.lte.${fim})`,
        )
        .order("id")
        .range(de, ate),
    );
    for (const [tipo, linhas] of [
      ["despesa", pagar],
      ["receita", receber],
    ] as const) {
      for (const l of linhas) {
        const data = l.data_competencia ?? l.data_emissao;
        if (!data) continue;
        lancamentos.push({
          id: l.id,
          tipo,
          descricao: l.descricao,
          mes: data.slice(0, 7),
          valor: Number(l.valor_original),
          chave: extrairChave(l.observacoes),
        });
      }
    }
  }
  return { clientes, lancamentos, categorias };
}

export type Preparado = { analise: AnalisePlanilha; preparo: Preparo };

/** Lê o arquivo, analisa e compara com o banco. Serve para a prévia e para a gravação. */
export async function prepararDoArquivo(
  db: Db,
  tenantId: string,
  nomeArquivo: string,
  bytes: Uint8Array,
  opcoesPedidas?: Partial<OpcoesImportacao>,
): Promise<Preparado> {
  const planilha = lerPlanilha(nomeArquivo, bytes);
  const analise = analisarPlanilha(planilha, hojeEmSaoPaulo());
  const opcoes = juntarOpcoes(analise, opcoesPedidas);
  const layout = analise.dre.find((l) => l.id === opcoes.layoutDre) ?? null;
  const intervalo = intervaloDeMeses(itensDoLayout(layout, opcoes));
  const existentes = await carregarExistentes(db, tenantId, intervalo);
  const preparo = montarPreparo({ analise, opcoes, existentes, sugerir: sugerirPorNome });
  return { analise, preparo };
}

/* ------------------------------------------------------------------- gravação */

async function inserir(db: Db, tabela: string, linhas: unknown[], selecionar?: string) {
  const ids: unknown[] = [];
  for (const lote of lotes(linhas)) {
    const consulta = db.from(tabela).insert(lote);
    const { data, error } = await (selecionar ? consulta.select(selecionar) : consulta);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    if (selecionar && Array.isArray(data)) ids.push(...data);
  }
  return ids;
}

async function atualizar(db: Db, tabela: string, id: string, tenantId: string, campos: Record<string, unknown>) {
  const { error } = await db.from(tabela).update(campos).eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(`${tabela}: ${error.message}`);
}

async function garantirClienteTecnico(db: Db, tenantId: string): Promise<string> {
  const { data, error } = await db
    .from("clientes")
    .select("id, nome")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .ilike("nome", `%${NOME_CLIENTE_TECNICO}`)
    .limit(1);
  if (error) throw new Error(`clientes: ${error.message}`);
  if (data?.[0]?.id) return data[0].id as string;

  const criado = await inserir(
    db,
    "clientes",
    [
      {
        tenant_id: tenantId,
        nome: NOME_CLIENTE_TECNICO,
        ativo: false,
        estagio_funil: "lead",
        origem: ORIGEM_CLIENTES,
        tipo_pessoa: "pf",
        consentimento_contato: false,
        observacoes:
          "Registro técnico: recebe as receitas consolidadas importadas da planilha. Não é um cliente de verdade.",
      },
    ],
    "id",
  );
  const id = (criado[0] as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Não consegui criar o registro técnico de receitas.");
  return id;
}

export async function gravarImportacao(
  db: Db,
  tenantId: string,
  analise: AnalisePlanilha,
  preparo: Preparo,
): Promise<{ resumo: ResumoImportacao; avisos: string[] }> {
  const { opcoes } = preparo;
  const nomeArquivo = analise.nomeArquivo;
  const avisos: string[] = [];
  const resumo: ResumoImportacao = {
    clientesCriados: 0,
    clientesAtualizados: 0,
    clientesIguais: 0,
    lancamentosCriados: 0,
    lancamentosAtualizados: 0,
    lancamentosMantidos: 0,
    categoriasCriadas: 0,
    mesesImportados: [],
    mesesPulados: [],
  };

  try {
    /* 1) Categorias que ainda não existem. */
    const idsDeCategoria = new Map<string, string>();
    for (const c of preparo.categorias) {
      if (c.existenteId) idsDeCategoria.set(`${c.tipo}|${sem(c.nome)}`, c.existenteId);
    }
    const novas = preparo.categorias.filter((c) => c.nova);
    if (novas.length) {
      const agora = new Date().toISOString();
      const criadas = (await inserir(
        db,
        "categorias_financeiras",
        novas.map((c) => ({
          tenant_id: tenantId,
          nome: c.nome,
          tipo: c.tipo,
          ativo: true,
          dre_linha: c.nova?.dre_linha ?? null,
          dre_detalhe: c.nova?.dre_detalhe ?? null,
          dre_classificacao_origem: c.nova?.origem ?? null,
          dre_classificacao_em: c.nova?.origem ? agora : null,
        })),
        "id, nome, tipo",
      )) as Array<{ id: string; nome: string; tipo: string }>;
      for (const c of criadas) idsDeCategoria.set(`${c.tipo}|${sem(c.nome)}`, c.id);
      resumo.categoriasCriadas = criadas.length;
    }

    /* 2) Clientes. */
    const novosClientes = preparo.planoClientes.filter((p) => p.situacao === "novo");
    if (novosClientes.length) {
      await inserir(
        db,
        "clientes",
        novosClientes.map(({ cliente: c }) => ({
          tenant_id: tenantId,
          nome: c.nome,
          ativo: c.ativo,
          segmento: c.nicho,
          origem: ORIGEM_CLIENTES,
          estagio_funil: estagioDoCliente(c.ativo),
          data_referencia: c.entrada,
          data_fechamento: c.ativo ? null : c.saida,
          valor_estimado: c.mrr,
          motivo_perda: c.ativo ? null : c.motivo,
          observacoes: observacaoDoCliente(c, nomeArquivo),
          tipo_pessoa: "pf",
          consentimento_contato: false,
        })),
      );
      resumo.clientesCriados = novosClientes.length;
    }
    for (const p of preparo.planoClientes.filter((x) => x.situacao === "atualizar" && x.existenteId)) {
      const c = p.cliente;
      const campos: Record<string, unknown> = {
        ativo: c.ativo,
        estagio_funil: estagioDoCliente(c.ativo),
        data_fechamento: c.ativo ? null : c.saida,
      };
      if (c.mrr != null) campos.valor_estimado = c.mrr;
      if (!c.ativo && c.motivo) campos.motivo_perda = c.motivo;
      if (c.ativo) campos.motivo_perda = null;
      if (p.mudancas.includes("nicho") && c.nicho) campos.segmento = c.nicho;
      await atualizar(db, "clientes", p.existenteId as string, tenantId, campos);
      resumo.clientesAtualizados++;
    }
    resumo.clientesIguais = preparo.planoClientes.filter((p) => p.situacao === "igual").length;

    /* 3) Lançamentos da DRE. */
    const aba = preparo.layout?.aba ?? "";
    const idCategoria = (tipo: string, rotulo: string) => idsDeCategoria.get(`${tipo}|${sem(rotulo)}`) ?? null;

    const criar = preparo.planoLancamentos.filter((l) => l.acao === "criar");
    const atualizarLanc = preparo.planoLancamentos.filter((l) => l.acao === "atualizar" && l.existenteId);
    resumo.lancamentosMantidos = preparo.planoLancamentos.filter((l) => l.acao === "manter").length;

    const receitas = criar.filter((l) => l.item.tipo === "receita");
    const despesas = criar.filter((l) => l.item.tipo === "despesa");

    if (receitas.length) {
      const clienteId = await garantirClienteTecnico(db, tenantId);
      await inserir(
        db,
        "contas_receber",
        receitas.map(({ item }) => {
          const fim = ultimoDiaDoMes(item.mes);
          return {
            tenant_id: tenantId,
            cliente_id: clienteId,
            descricao: descricaoDoLancamento(item),
            valor_original: item.valor,
            valor_recebido: item.valor,
            status: "recebido",
            parcela_numero: 1,
            parcela_total: 1,
            data_emissao: fim,
            data_competencia: `${item.mes}-01`,
            data_vencimento: fim,
            data_recebimento: fim,
            categoria_financeira_id: idCategoria(item.tipo, item.rotulo),
            observacoes: observacaoDoLancamento(item, nomeArquivo, aba),
          };
        }),
      );
    }
    if (despesas.length) {
      await inserir(
        db,
        "contas_pagar",
        despesas.map(({ item }) => {
          const fim = ultimoDiaDoMes(item.mes);
          return {
            tenant_id: tenantId,
            descricao: descricaoDoLancamento(item),
            valor_original: item.valor,
            valor_pago: item.valor,
            status: "pago",
            parcela_numero: 1,
            parcela_total: 1,
            data_emissao: fim,
            data_competencia: `${item.mes}-01`,
            data_vencimento: fim,
            data_pagamento: fim,
            fornecedor_nome: "Consolidado da planilha",
            categoria_financeira_id: idCategoria(item.tipo, item.rotulo),
            observacoes: observacaoDoLancamento(item, nomeArquivo, aba),
          };
        }),
      );
    }
    resumo.lancamentosCriados = criar.length;

    for (const l of atualizarLanc) {
      const tabela = l.item.tipo === "receita" ? "contas_receber" : "contas_pagar";
      const campos: Record<string, unknown> =
        l.item.tipo === "receita"
          ? { valor_original: l.item.valor, valor_recebido: l.item.valor }
          : { valor_original: l.item.valor, valor_pago: l.item.valor };
      await atualizar(db, tabela, l.existenteId as string, tenantId, campos);
      resumo.lancamentosAtualizados++;
    }

    const mesesComLancamento = new Set(preparo.planoLancamentos.map((l) => l.item.mes));
    resumo.mesesImportados = [...mesesComLancamento].sort();
    for (const m of preparo.planoMeses) {
      if (!opcoes.mesesDre.includes(m.mes)) continue;
      if (m.situacao === "ocupado") {
        resumo.mesesPulados.push({
          mes: m.mes,
          motivo: `já tem ${m.existentesDeOutraOrigem} lançamento(s) de outra origem; para não somar em dobro, ficou de fora`,
        });
      }
    }
  } catch (e) {
    const feito = [
      resumo.categoriasCriadas ? `${resumo.categoriasCriadas} categoria(s)` : "",
      resumo.clientesCriados ? `${resumo.clientesCriados} cliente(s)` : "",
      resumo.lancamentosCriados ? `${resumo.lancamentosCriados} lançamento(s)` : "",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `${e instanceof Error ? e.message : "Erro ao gravar."}${
        feito ? ` Antes do erro foram gravados: ${feito}. Envie o arquivo de novo para completar — o que já entrou não duplica.` : ""
      }`,
    );
  }
  return { resumo, avisos };
}
