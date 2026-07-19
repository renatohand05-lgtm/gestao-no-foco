import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildDreStatementLines,
  buildOpexHierarchyNodes,
  composeDreTotals,
  filterEntriesByLinha,
  principalOpexGrupo,
  resolveDreLinha,
  suggestDreClassificationFromName,
  toDreResumo,
  type DreLedgerEntry,
} from "@/lib/dre";
import { parseDreDetalhe } from "@/lib/dre/dre-opex-hierarchy";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  DreDrillItem,
  DreFilters,
  DreFilterOptions,
  DreGap,
  DreResult,
} from "@/types/dre";

type CategoriaJoin = {
  id: string;
  nome: string;
  tipo: string;
  plano_conta_id: string | null;
  dre_linha: string | null;
  dre_detalhe: string | null;
} | null;

type PlanoJoin = {
  id: string;
  nome: string;
  codigo: string;
  tipo: string;
  dre_linha: string | null;
  dre_detalhe: string | null;
} | null;

type VendaRow = {
  id: string;
  numero: number;
  data_venda: string;
  subtotal: number;
  desconto_total: number;
  total: number;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  categoria_financeira: CategoriaJoin;
  itens: Array<{
    id: string;
    quantidade: number;
    custo_unitario: number | null;
    deleted_at: string | null;
  }> | null;
};

type ContaReceberRow = {
  id: string;
  descricao: string;
  data_emissao: string;
  data_competencia: string | null;
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  status: string;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  plano_conta_id: string | null;
  categoria_financeira: CategoriaJoin;
  plano_conta: PlanoJoin;
};

type ContaPagarRow = {
  id: string;
  descricao: string;
  data_competencia: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  status: string;
  fornecedor_nome: string | null;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  plano_conta_id: string | null;
  categoria_financeira: CategoriaJoin;
  plano_conta: PlanoJoin;
  rateios: Array<{
    id: string;
    centro_custo_id: string;
    percentual: number;
    valor: number;
    descricao: string | null;
    deleted_at: string | null;
    centro_custo?: { id: string; nome: string; codigo: string } | null;
  }> | null;
};

const VENDA_SELECT = `
  id,
  numero,
  data_venda,
  subtotal,
  desconto_total,
  total,
  categoria_financeira_id,
  centro_custo_id,
  categoria_financeira:categorias_financeiras!vendas_categoria_financeira_id_fkey (
    id, nome, tipo, plano_conta_id, dre_linha, dre_detalhe
  ),
  itens:venda_itens ( id, quantidade, custo_unitario, deleted_at )
`;

const CR_SELECT = `
  id,
  descricao,
  data_emissao,
  data_competencia,
  valor_original,
  desconto,
  juros,
  multa,
  status,
  categoria_financeira_id,
  centro_custo_id,
  plano_conta_id,
  categoria_financeira:categorias_financeiras ( id, nome, tipo, plano_conta_id, dre_linha, dre_detalhe ),
  plano_conta:plano_contas ( id, nome, codigo, tipo, dre_linha, dre_detalhe )
`;

const CP_SELECT = `
  id,
  descricao,
  data_competencia,
  data_vencimento,
  data_pagamento,
  valor_original,
  desconto,
  juros,
  multa,
  status,
  fornecedor_nome,
  categoria_financeira_id,
  centro_custo_id,
  plano_conta_id,
  categoria_financeira:categorias_financeiras ( id, nome, tipo, plano_conta_id, dre_linha, dre_detalhe ),
  plano_conta:plano_contas ( id, nome, codigo, tipo, dre_linha, dre_detalhe ),
  rateios:contas_pagar_rateios ( id, centro_custo_id, percentual, valor, descricao, deleted_at, centro_custo:centros_custo ( id, nome, codigo ) )
`;

function resolvedPlanoId(row: {
  plano_conta_id?: string | null;
  categoria_financeira?: CategoriaJoin;
}): string | null {
  return row.plano_conta_id ?? row.categoria_financeira?.plano_conta_id ?? null;
}

function resolveDreDetalhe(input: {
  planoDreDetalhe?: string | null;
  categoriaDreDetalhe?: string | null;
}): string | null {
  return (
    parseDreDetalhe(input.planoDreDetalhe) ??
    parseDreDetalhe(input.categoriaDreDetalhe)
  );
}

function gapSugestaoFromNames(...names: Array<string | null | undefined>) {
  for (const name of names) {
    const s = suggestDreClassificationFromName(name);
    if (s) {
      return {
        linha: s.linha,
        detalhe: s.detalhe,
        grupoLabel: s.grupoLabel,
        detalheLabel: s.detalheLabel,
        pathLabel: s.pathLabel,
        origem: s.origem,
      };
    }
  }
  return null;
}

function matchesDimensoes(
  row: {
    categoria_financeira_id: string | null;
    centro_custo_id: string | null;
    plano_conta_id?: string | null;
    categoria_financeira?: CategoriaJoin;
  },
  filters: DreFilters,
  centroOverride?: string | null,
): boolean {
  if (
    filters.categoriaId &&
    row.categoria_financeira_id !== filters.categoriaId
  ) {
    return false;
  }

  const centro = centroOverride ?? row.centro_custo_id;
  if (filters.centroCustoId && centro !== filters.centroCustoId) {
    return false;
  }

  if (filters.planoContaId && resolvedPlanoId(row) !== filters.planoContaId) {
    return false;
  }

  return true;
}

function toDrill(entries: DreLedgerEntry[]): DreDrillItem[] {
  return entries.map((e) => ({
    id: e.id,
    origem: e.origem,
    origemId: e.origemId,
    corrigirId: e.corrigirId,
    descricao: e.descricao,
    competencia: e.competencia,
    valor: e.valor,
    centroCustoId: e.centroCustoId,
    categoriaId: e.categoriaId,
    planoContaId: e.planoContaId,
    fornecedorNome: e.fornecedorNome,
    status: e.status,
    linha: e.linha,
    detalhe: e.detalhe ?? null,
    documento: e.documento,
    categoriaNome: e.categoriaNome ?? null,
    planoContaNome: e.planoContaNome ?? null,
    centroCustoNome: e.centroCustoNome ?? null,
    dataVencimento: e.dataVencimento ?? null,
    dataPagamento: e.dataPagamento ?? null,
    rateioDescricao: e.rateioDescricao ?? null,
    rateioPercentual: e.rateioPercentual ?? null,
  }));
}

/**
 * DRE por competência.
 * Fonte económica: vendas faturadas, CR avulsas, CP (nunca movimentação bancária).
 */
export class DreService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listFilterOptions(): Promise<DreFilterOptions> {
    const [centros, categorias, planos] = await Promise.all([
      this.supabase
        .from("centros_custo")
        .select("id, nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      this.supabase
        .from("categorias_financeiras")
        .select("id, nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      this.supabase
        .from("plano_contas")
        .select("id, nome, codigo")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .in("tipo", ["receita", "despesa"])
        .order("codigo", { ascending: true }),
    ]);

    if (centros.error) throw new Error(centros.error.message);
    if (categorias.error) throw new Error(categorias.error.message);
    if (planos.error) throw new Error(planos.error.message);

    return {
      centrosCusto: centros.data ?? [],
      categorias: categorias.data ?? [],
      planosConta: (planos.data ?? []).map((plano) => ({
        id: plano.id,
        nome: `${plano.codigo} · ${plano.nome}`,
      })),
    };
  }

  async getDre(filters: DreFilters): Promise<DreResult> {
    const { entries, gaps, filterOptions } = await this.buildLedger(filters);
    const totals = composeDreTotals(entries);
    const resumo = toDreResumo(totals);
    const opexNodes = buildOpexHierarchyNodes(entries);
    const principal = principalOpexGrupo(opexNodes);
    const pct =
      resumo.receita_liquida > 0
        ? Math.round(
            (resumo.despesas_operacionais_adm! / resumo.receita_liquida) * 1000,
          ) / 10
        : null;

    resumo.opex_grupo_principal = principal?.label ?? null;
    resumo.opex_pct_receita_liquida = pct;

    const linhas = buildDreStatementLines(totals).map((line) => {
      if (line.dreLinha === "despesas_operacionais") {
        const children = opexNodes.map((node) => ({
          codigo: node.key,
          label: node.label,
          valor: node.valor,
          depth: node.depth,
          expandable: (node.children?.length ?? 0) > 0,
          drillable: node.drillable,
          dreLinha: node.dreLinha,
          dreDetalhe: node.dreDetalhe,
          pctReceitaLiquida:
            resumo.receita_liquida > 0
              ? Math.round((node.valor / resumo.receita_liquida) * 1000) / 10
              : null,
          children: (node.children ?? []).map((child) => ({
            codigo: child.key,
            label: child.label,
            valor: child.valor,
            depth: child.depth,
            drillable: true,
            dreLinha: child.dreLinha,
            dreDetalhe: child.dreDetalhe,
            pctReceitaLiquida:
              resumo.receita_liquida > 0
                ? Math.round((child.valor / resumo.receita_liquida) * 1000) / 10
                : null,
          })),
        }));
        return {
          ...line,
          expandable: children.length > 0,
          children,
          pctReceitaLiquida: pct,
        };
      }
      return {
        ...line,
        pctReceitaLiquida:
          resumo.receita_liquida > 0 && line.drillable
            ? Math.round((line.valor / resumo.receita_liquida) * 1000) / 10
            : null,
      };
    });

    return {
      resumo,
      linhas,
      gaps,
      filterOptions,
      drillItems: toDrill(entries),
      opexHierarchy: linhas.find((l) => l.dreLinha === "despesas_operacionais")
        ?.children,
    };
  }

  async getDreDrillDown(
    filters: DreFilters,
    linha: string,
    detalhe?: string | null,
  ): Promise<DreDrillItem[]> {
    const { entries } = await this.buildLedger(filters);
    return toDrill(filterEntriesByLinha(entries, linha, detalhe));
  }

  private async buildLedger(filters: DreFilters): Promise<{
    entries: DreLedgerEntry[];
    gaps: DreGap[];
    filterOptions: DreFilterOptions;
  }> {
    const [filterOptions, vendas, contasReceber, contasPagar] =
      await Promise.all([
        this.listFilterOptions(),
        this.fetchVendas(filters),
        this.fetchContasReceberAvulsas(filters),
        this.fetchContasPagar(filters),
      ]);

    const gaps: DreGap[] = [];
    const entries: DreLedgerEntry[] = [];

    for (const venda of vendas) {
      const faltantes: string[] = [];
      if (filters.categoriaId && !venda.categoria_financeira_id) {
        faltantes.push("categoria_financeira_id");
      }
      if (filters.centroCustoId && !venda.centro_custo_id) {
        faltantes.push("centro_custo_id");
      }
      if (filters.planoContaId && !resolvedPlanoId(venda)) {
        faltantes.push(
          ...(venda.categoria_financeira_id
            ? ["categoria.plano_conta_id"]
            : ["categoria_financeira_id", "categoria.plano_conta_id"]),
        );
      }

      if (faltantes.length > 0) {
        gaps.push({
          origem: "venda",
          id: venda.id,
          corrigir_id: venda.id,
          descricao: `Venda #${venda.numero}`,
          data_competencia: venda.data_venda,
          valor: Number(venda.total),
          campos_faltantes: [...new Set(faltantes)],
        });
        continue;
      }

      if (!matchesDimensoes(venda, filters)) continue;

      const planoId = resolvedPlanoId(venda);
      entries.push({
        id: `venda-rb-${venda.id}`,
        origem: "venda",
        origemId: venda.id,
        corrigirId: venda.id,
        descricao: `Venda #${venda.numero}`,
        competencia: venda.data_venda,
        linha: "receita_bruta",
        valor: Number(venda.subtotal),
        centroCustoId: venda.centro_custo_id,
        categoriaId: venda.categoria_financeira_id,
        planoContaId: planoId,
        fornecedorNome: null,
        status: "faturado",
        documento: String(venda.numero),
      });

      if (Number(venda.desconto_total) > 0) {
        entries.push({
          id: `venda-ded-${venda.id}`,
          origem: "venda",
          origemId: venda.id,
          corrigirId: venda.id,
          descricao: `Venda #${venda.numero} — descontos`,
          competencia: venda.data_venda,
          linha: "deducoes",
          valor: Number(venda.desconto_total),
          centroCustoId: venda.centro_custo_id,
          categoriaId: venda.categoria_financeira_id,
          planoContaId: planoId,
          fornecedorNome: null,
          status: "faturado",
          documento: String(venda.numero),
        });
      }

      for (const item of venda.itens ?? []) {
        if (item.deleted_at) continue;
        if (item.custo_unitario === null || item.custo_unitario === undefined) {
          gaps.push({
            origem: "venda",
            id: item.id,
            corrigir_id: venda.id,
            descricao: `Venda #${venda.numero} — item sem custo`,
            data_competencia: venda.data_venda,
            valor: 0,
            campos_faltantes: ["custo_unitario"],
          });
          continue;
        }
        entries.push({
          id: `venda-cmv-${item.id}`,
          origem: "venda",
          origemId: venda.id,
          corrigirId: venda.id,
          descricao: `Venda #${venda.numero} — CMV`,
          competencia: venda.data_venda,
          linha: "cmv",
          valor: Number(item.custo_unitario) * Number(item.quantidade),
          centroCustoId: venda.centro_custo_id,
          categoriaId: venda.categoria_financeira_id,
          planoContaId: planoId,
          fornecedorNome: null,
          status: "faturado",
          documento: String(venda.numero),
        });
      }
    }

    for (const titulo of contasReceber) {
      const competencia = titulo.data_competencia ?? titulo.data_emissao;
      const faltantes: string[] = [];
      if (!titulo.categoria_financeira_id) faltantes.push("categoria_financeira_id");
      if (!titulo.centro_custo_id) faltantes.push("centro_custo_id");
      if (!resolvedPlanoId(titulo)) faltantes.push("plano_conta_id");

      if (faltantes.length > 0) {
        gaps.push({
          origem: "conta_receber",
          id: titulo.id,
          corrigir_id: titulo.id,
          descricao: titulo.descricao,
          data_competencia: competencia,
          valor: Number(titulo.valor_original),
          campos_faltantes: [...new Set(faltantes)],
          categoria_id: titulo.categoria_financeira_id,
          plano_id: titulo.plano_conta_id,
          sugestao: gapSugestaoFromNames(
            titulo.categoria_financeira?.nome,
            titulo.descricao,
            titulo.plano_conta?.nome,
          ),
        });
        continue;
      }

      if (!matchesDimensoes(titulo, filters)) continue;

      const planoId = resolvedPlanoId(titulo);
      const linhaRb = resolveDreLinha({
        planoDreLinha: titulo.plano_conta?.dre_linha,
        categoriaDreLinha: titulo.categoria_financeira?.dre_linha,
        planoTipo: titulo.plano_conta?.tipo,
        categoriaTipo: titulo.categoria_financeira?.tipo,
      });

      if (!linhaRb) {
        gaps.push({
          origem: "conta_receber",
          id: titulo.id,
          corrigir_id: titulo.id,
          descricao: titulo.descricao,
          data_competencia: competencia,
          valor: Number(titulo.valor_original),
          campos_faltantes: ["dre_linha_indefinida"],
          categoria_id: titulo.categoria_financeira_id,
          plano_id: titulo.plano_conta_id,
          sugestao: gapSugestaoFromNames(
            titulo.categoria_financeira?.nome,
            titulo.descricao,
            titulo.plano_conta?.nome,
          ),
        });
        continue;
      }

      const detalheCr = resolveDreDetalhe({
        planoDreDetalhe: titulo.plano_conta?.dre_detalhe,
        categoriaDreDetalhe: titulo.categoria_financeira?.dre_detalhe,
      });

      entries.push({
        id: `cr-rb-${titulo.id}`,
        origem: "conta_receber",
        origemId: titulo.id,
        corrigirId: titulo.id,
        descricao: titulo.descricao,
        competencia,
        linha: linhaRb === "deducoes" ? "receita_bruta" : linhaRb,
        valor: Number(titulo.valor_original),
        centroCustoId: titulo.centro_custo_id,
        categoriaId: titulo.categoria_financeira_id,
        planoContaId: planoId,
        fornecedorNome: null,
        status: titulo.status,
        documento: null,
        categoriaNome: titulo.categoria_financeira?.nome ?? null,
        planoContaNome: titulo.plano_conta
          ? `${titulo.plano_conta.codigo} · ${titulo.plano_conta.nome}`
          : null,
        detalhe: detalheCr,
      });

      if (Number(titulo.desconto) > 0) {
        entries.push({
          id: `cr-ded-${titulo.id}`,
          origem: "conta_receber",
          origemId: titulo.id,
          corrigirId: titulo.id,
          descricao: `${titulo.descricao} — desconto`,
          competencia,
          linha: "deducoes",
          valor: Number(titulo.desconto),
          centroCustoId: titulo.centro_custo_id,
          categoriaId: titulo.categoria_financeira_id,
          planoContaId: planoId,
          fornecedorNome: null,
          status: titulo.status,
          documento: null,
        });
      }

      const financeira = Number(titulo.juros) + Number(titulo.multa);
      if (financeira > 0) {
        entries.push({
          id: `cr-fin-${titulo.id}`,
          origem: "conta_receber",
          origemId: titulo.id,
          corrigirId: titulo.id,
          descricao: `${titulo.descricao} — juros/multa`,
          competencia,
          linha: "receitas_financeiras",
          valor: financeira,
          centroCustoId: titulo.centro_custo_id,
          categoriaId: titulo.categoria_financeira_id,
          planoContaId: planoId,
          fornecedorNome: null,
          status: titulo.status,
          documento: null,
        });
      }
    }

    for (const titulo of contasPagar) {
      const linhaBase = resolveDreLinha({
        planoDreLinha: titulo.plano_conta?.dre_linha,
        categoriaDreLinha: titulo.categoria_financeira?.dre_linha,
        planoTipo: titulo.plano_conta?.tipo,
        categoriaTipo: titulo.categoria_financeira?.tipo,
      });

      const faltantes: string[] = [];
      if (!titulo.categoria_financeira_id) faltantes.push("categoria_financeira_id");
      if (!titulo.centro_custo_id && !(titulo.rateios ?? []).some((r) => !r.deleted_at)) {
        faltantes.push("centro_custo_id");
      }
      if (!titulo.plano_conta_id && !titulo.categoria_financeira?.plano_conta_id) {
        faltantes.push("plano_conta_id");
      }
      if (!linhaBase && faltantes.length === 0) {
        faltantes.push("dre_linha_indefinida");
      }

      const uniqueFaltantes = [...new Set(faltantes)];
      const baseOperacional =
        Number(titulo.valor_original) - Number(titulo.desconto);
      const financeira = Number(titulo.juros) + Number(titulo.multa);
      const valorCompetencia = baseOperacional + financeira;

      if (uniqueFaltantes.length > 0) {
        gaps.push({
          origem: "conta_pagar",
          id: titulo.id,
          corrigir_id: titulo.id,
          descricao: titulo.descricao,
          data_competencia: titulo.data_competencia,
          valor: valorCompetencia,
          campos_faltantes: uniqueFaltantes,
          categoria_id: titulo.categoria_financeira_id,
          plano_id: titulo.plano_conta_id,
          sugestao: gapSugestaoFromNames(
            titulo.categoria_financeira?.nome,
            titulo.descricao,
            titulo.plano_conta?.nome,
            titulo.fornecedor_nome,
          ),
        });
        continue;
      }

      const ativoRateios = (titulo.rateios ?? []).filter((r) => !r.deleted_at);
      const planoId = resolvedPlanoId(titulo);
      const linha = linhaBase!;
      const detalhe = resolveDreDetalhe({
        planoDreDetalhe: titulo.plano_conta?.dre_detalhe,
        categoriaDreDetalhe: titulo.categoria_financeira?.dre_detalhe,
      });
      const metaBase = {
        categoriaNome: titulo.categoria_financeira?.nome ?? null,
        planoContaNome: titulo.plano_conta
          ? `${titulo.plano_conta.codigo} · ${titulo.plano_conta.nome}`
          : null,
        dataVencimento: titulo.data_vencimento,
        dataPagamento: titulo.data_pagamento,
        detalhe,
      };

      if (ativoRateios.length > 0) {
        for (const rateio of ativoRateios) {
          if (!matchesDimensoes(titulo, filters, rateio.centro_custo_id)) {
            continue;
          }
          const share =
            Number(titulo.valor_original) > 0
              ? Number(rateio.valor) / Number(titulo.valor_original)
              : Number(rateio.percentual) / 100;
          const valorBase = Math.round(baseOperacional * share * 100) / 100;
          const valorFin = Math.round(financeira * share * 100) / 100;
          const centroNome = rateio.centro_custo
            ? `${rateio.centro_custo.codigo} · ${rateio.centro_custo.nome}`
            : null;

          if (valorBase !== 0) {
            entries.push({
              id: `cp-${titulo.id}-r-${rateio.id}`,
              origem: "conta_pagar_rateio",
              origemId: titulo.id,
              corrigirId: titulo.id,
              descricao: `${titulo.descricao} (rateio)`,
              competencia: titulo.data_competencia,
              linha,
              valor: valorBase,
              centroCustoId: rateio.centro_custo_id,
              categoriaId: titulo.categoria_financeira_id,
              planoContaId: planoId,
              fornecedorNome: titulo.fornecedor_nome,
              status: titulo.status,
              documento: null,
              ...metaBase,
              centroCustoNome: centroNome,
              rateioDescricao: rateio.descricao,
              rateioPercentual: Number(rateio.percentual),
            });
          }
          if (valorFin !== 0) {
            entries.push({
              id: `cp-fin-${titulo.id}-r-${rateio.id}`,
              origem: "conta_pagar_rateio",
              origemId: titulo.id,
              corrigirId: titulo.id,
              descricao: `${titulo.descricao} — juros/multa (rateio)`,
              competencia: titulo.data_competencia,
              linha: "despesas_financeiras",
              valor: valorFin,
              centroCustoId: rateio.centro_custo_id,
              categoriaId: titulo.categoria_financeira_id,
              planoContaId: planoId,
              fornecedorNome: titulo.fornecedor_nome,
              status: titulo.status,
              documento: null,
              ...metaBase,
              centroCustoNome: centroNome,
              rateioDescricao: rateio.descricao,
              rateioPercentual: Number(rateio.percentual),
            });
          }
        }
      } else {
        if (!matchesDimensoes(titulo, filters)) continue;

        if (baseOperacional !== 0) {
          entries.push({
            id: `cp-${titulo.id}`,
            origem: "conta_pagar",
            origemId: titulo.id,
            corrigirId: titulo.id,
            descricao: titulo.descricao,
            competencia: titulo.data_competencia,
            linha,
            valor: baseOperacional,
            centroCustoId: titulo.centro_custo_id,
            categoriaId: titulo.categoria_financeira_id,
            planoContaId: planoId,
            fornecedorNome: titulo.fornecedor_nome,
            status: titulo.status,
            documento: null,
            ...metaBase,
          });
        }
        if (financeira !== 0) {
          entries.push({
            id: `cp-fin-${titulo.id}`,
            origem: "conta_pagar",
            origemId: titulo.id,
            corrigirId: titulo.id,
            descricao: `${titulo.descricao} — juros/multa`,
            competencia: titulo.data_competencia,
            linha: "despesas_financeiras",
            valor: financeira,
            centroCustoId: titulo.centro_custo_id,
            categoriaId: titulo.categoria_financeira_id,
            planoContaId: planoId,
            fornecedorNome: titulo.fornecedor_nome,
            status: titulo.status,
            documento: null,
            ...metaBase,
          });
        }
      }
    }

    return { entries, gaps, filterOptions };
  }

  private async fetchVendas(filters: DreFilters): Promise<VendaRow[]> {
    let query = this.supabase
      .from("vendas")
      .select(VENDA_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .gte("data_venda", filters.dataDe)
      .lte("data_venda", filters.dataAte);

    if (filters.categoriaId) {
      query = query.eq("categoria_financeira_id", filters.categoriaId);
    }
    if (filters.centroCustoId) {
      query = query.eq("centro_custo_id", filters.centroCustoId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as VendaRow[];
  }

  private async fetchContasReceberAvulsas(
    filters: DreFilters,
  ): Promise<ContaReceberRow[]> {
    let query = this.supabase
      .from("contas_receber")
      .select(CR_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .is("venda_id", null)
      .neq("status", "cancelado")
      .gte("data_competencia", filters.dataDe)
      .lte("data_competencia", filters.dataAte);

    if (filters.categoriaId) {
      query = query.eq("categoria_financeira_id", filters.categoriaId);
    }
    if (filters.centroCustoId) {
      query = query.eq("centro_custo_id", filters.centroCustoId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ContaReceberRow[];
  }

  private async fetchContasPagar(
    filters: DreFilters,
  ): Promise<ContaPagarRow[]> {
    let query = this.supabase
      .from("contas_pagar")
      .select(CP_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .gte("data_competencia", filters.dataDe)
      .lte("data_competencia", filters.dataAte);

    if (filters.categoriaId) {
      query = query.eq("categoria_financeira_id", filters.categoriaId);
    }

    const { data, error } = await query;
    if (error) {
      const msg = error.message.toLowerCase();
      // Tabela de rateio ausente OU coluna descricao ainda não migrada
      if (msg.includes("contas_pagar_rateios") || msg.includes("descricao")) {
        if (msg.includes("descricao") && msg.includes("rateio")) {
          return this.fetchContasPagarWithoutRateioDescricao(filters);
        }
        return this.fetchContasPagarWithoutRateio(filters);
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as ContaPagarRow[];
  }

  private async fetchContasPagarWithoutRateioDescricao(
    filters: DreFilters,
  ): Promise<ContaPagarRow[]> {
    const select = CP_SELECT.replace(
      "rateios:contas_pagar_rateios ( id, centro_custo_id, percentual, valor, descricao, deleted_at, centro_custo:centros_custo ( id, nome, codigo ) )",
      "rateios:contas_pagar_rateios ( id, centro_custo_id, percentual, valor, deleted_at, centro_custo:centros_custo ( id, nome, codigo ) )",
    );
    let query = this.supabase
      .from("contas_pagar")
      .select(select)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .gte("data_competencia", filters.dataDe)
      .lte("data_competencia", filters.dataAte);

    if (filters.categoriaId) {
      query = query.eq("categoria_financeira_id", filters.categoriaId);
    }

    const { data, error } = await query;
    if (error) {
      if (error.message.toLowerCase().includes("contas_pagar_rateios")) {
        return this.fetchContasPagarWithoutRateio(filters);
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as ContaPagarRow[];
  }

  private async fetchContasPagarWithoutRateio(
    filters: DreFilters,
  ): Promise<ContaPagarRow[]> {
    const select = CP_SELECT.replace(/,\s*rateios:[\s\S]*$/m, "");
    let query = this.supabase
      .from("contas_pagar")
      .select(select)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .gte("data_competencia", filters.dataDe)
      .lte("data_competencia", filters.dataAte);

    if (filters.categoriaId) {
      query = query.eq("categoria_financeira_id", filters.categoriaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as ContaPagarRow[]).map((row) => ({
      ...row,
      rateios: [],
    }));
  }
}

export async function createDreService(tenantId: string) {
  const supabase = await createClient();
  return new DreService(supabase, tenantId);
}

export function defaultDrePeriodo(now = new Date()): {
  dataDe: string;
  dataAte: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = (value: number) => String(value).padStart(2, "0");
  const dataDe = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dataAte = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { dataDe, dataAte };
}
