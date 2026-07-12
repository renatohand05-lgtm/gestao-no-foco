import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  DreFilters,
  DreFilterOptions,
  DreGap,
  DreLinha,
  DreResult,
  DreResumo,
} from "@/types/dre";

type CategoriaJoin = {
  id: string;
  nome: string;
  tipo: string;
  plano_conta_id: string | null;
} | null;

type PlanoJoin = {
  id: string;
  nome: string;
  codigo: string;
  tipo: string;
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
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  plano_conta_id: string | null;
  categoria_financeira: CategoriaJoin;
  plano_conta: PlanoJoin;
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
    id, nome, tipo, plano_conta_id
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
  categoria_financeira_id,
  centro_custo_id,
  plano_conta_id,
  categoria_financeira:categorias_financeiras ( id, nome, tipo, plano_conta_id ),
  plano_conta:plano_contas ( id, nome, codigo, tipo )
`;

const CP_SELECT = `
  id,
  descricao,
  data_competencia,
  valor_original,
  desconto,
  juros,
  multa,
  categoria_financeira_id,
  centro_custo_id,
  plano_conta_id,
  categoria_financeira:categorias_financeiras ( id, nome, tipo, plano_conta_id ),
  plano_conta:plano_contas ( id, nome, codigo, tipo )
`;

function resolvedPlanoId(row: {
  plano_conta_id?: string | null;
  categoria_financeira?: CategoriaJoin;
}): string | null {
  return row.plano_conta_id ?? row.categoria_financeira?.plano_conta_id ?? null;
}

function matchesDimensoes(
  row: {
    categoria_financeira_id: string | null;
    centro_custo_id: string | null;
    plano_conta_id?: string | null;
    categoria_financeira?: CategoriaJoin;
  },
  filters: DreFilters,
): boolean {
  if (
    filters.categoriaId &&
    row.categoria_financeira_id !== filters.categoriaId
  ) {
    return false;
  }

  if (filters.centroCustoId && row.centro_custo_id !== filters.centroCustoId) {
    return false;
  }

  if (filters.planoContaId && resolvedPlanoId(row) !== filters.planoContaId) {
    return false;
  }

  return true;
}

function resolveTipoDre(params: {
  planoTipo: string | null | undefined;
  categoriaTipo: string | null | undefined;
}): "receita" | "despesa" | null {
  if (params.planoTipo === "receita" || params.planoTipo === "despesa") {
    return params.planoTipo;
  }
  if (
    params.categoriaTipo === "receita" ||
    params.categoriaTipo === "despesa"
  ) {
    return params.categoriaTipo;
  }
  if (params.categoriaTipo === "ambos") {
    return "despesa";
  }
  return null;
}

function buildLinhas(resumo: DreResumo): DreLinha[] {
  return [
    {
      codigo: "receita_bruta",
      label: "Receita Bruta",
      valor: resumo.receita_bruta,
    },
    { codigo: "deducoes", label: "(-) Deduções", valor: resumo.deducoes },
    {
      codigo: "receita_liquida",
      label: "Receita Líquida",
      valor: resumo.receita_liquida,
      destaque: true,
    },
    { codigo: "cmv", label: "(-) CMV / custos variáveis", valor: resumo.cmv },
    {
      codigo: "margem_contribuicao",
      label: "Margem de contribuição",
      valor: resumo.margem_contribuicao,
      destaque: true,
    },
    {
      codigo: "despesas_operacionais",
      label: "(-) Despesas operacionais",
      valor: resumo.despesas_operacionais,
    },
    { codigo: "ebitda", label: "EBITDA", valor: resumo.ebitda, destaque: true },
    {
      codigo: "receitas_financeiras",
      label: "(+) Receitas financeiras",
      valor: resumo.receitas_financeiras,
    },
    {
      codigo: "despesas_financeiras",
      label: "(-) Despesas financeiras",
      valor: resumo.despesas_financeiras,
    },
    {
      codigo: "resultado_final",
      label: "Resultado final",
      valor: resumo.resultado_final,
      destaque: true,
    },
  ];
}

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
    const [filterOptions, vendas, contasReceber, contasPagar] =
      await Promise.all([
        this.listFilterOptions(),
        this.fetchVendas(filters),
        this.fetchContasReceberAvulsas(filters),
        this.fetchContasPagar(filters),
      ]);

    const gaps: DreGap[] = [];
    let receitaBruta = 0;
    let deducoes = 0;
    let cmv = 0;
    let receitasFinanceiras = 0;
    let despesasOperacionais = 0;
    let despesasFinanceiras = 0;

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

      if (!matchesDimensoes(venda, filters)) {
        continue;
      }

      receitaBruta += Number(venda.subtotal);
      deducoes += Number(venda.desconto_total);

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
        cmv += Number(item.custo_unitario) * Number(item.quantidade);
      }
    }

    for (const titulo of contasReceber) {
      const competencia =
        titulo.data_competencia ?? titulo.data_emissao;
      const faltantes: string[] = [];
      if (!titulo.categoria_financeira_id) {
        faltantes.push("categoria_financeira_id");
      }
      if (!titulo.centro_custo_id) {
        faltantes.push("centro_custo_id");
      }
      if (!resolvedPlanoId(titulo)) {
        faltantes.push("plano_conta_id");
      }
      if (filters.categoriaId && !titulo.categoria_financeira_id) {
        faltantes.push("categoria_financeira_id");
      }
      if (filters.centroCustoId && !titulo.centro_custo_id) {
        faltantes.push("centro_custo_id");
      }
      if (filters.planoContaId && !resolvedPlanoId(titulo)) {
        faltantes.push("plano_conta_id");
      }

      if (faltantes.length > 0) {
        gaps.push({
          origem: "conta_receber",
          id: titulo.id,
          corrigir_id: titulo.id,
          descricao: titulo.descricao,
          data_competencia: competencia,
          valor: Number(titulo.valor_original),
          campos_faltantes: [...new Set(faltantes)],
        });
        continue;
      }

      if (!matchesDimensoes(titulo, filters)) {
        continue;
      }

      receitaBruta += Number(titulo.valor_original);
      deducoes += Number(titulo.desconto);
      receitasFinanceiras += Number(titulo.juros) + Number(titulo.multa);
    }

    for (const titulo of contasPagar) {
      const tipoDre = resolveTipoDre({
        planoTipo: titulo.plano_conta?.tipo ?? null,
        categoriaTipo: titulo.categoria_financeira?.tipo ?? null,
      });

      const faltantes: string[] = [];
      if (!titulo.categoria_financeira_id) {
        faltantes.push("categoria_financeira_id");
      }
      if (!titulo.centro_custo_id) {
        faltantes.push("centro_custo_id");
      }
      if (!titulo.plano_conta_id && !titulo.categoria_financeira?.plano_conta_id) {
        faltantes.push("plano_conta_id");
      }
      if (!tipoDre && faltantes.length === 0) {
        faltantes.push("tipo_dre_indefinido");
      }

      if (filters.categoriaId && !titulo.categoria_financeira_id) {
        faltantes.push("categoria_financeira_id");
      }
      if (filters.centroCustoId && !titulo.centro_custo_id) {
        faltantes.push("centro_custo_id");
      }
      if (filters.planoContaId && !resolvedPlanoId(titulo)) {
        faltantes.push("plano_conta_id");
      }

      const uniqueFaltantes = [...new Set(faltantes)];
      const valorCompetencia =
        Number(titulo.valor_original) -
        Number(titulo.desconto) +
        Number(titulo.juros) +
        Number(titulo.multa);

      if (uniqueFaltantes.length > 0) {
        gaps.push({
          origem: "conta_pagar",
          id: titulo.id,
          corrigir_id: titulo.id,
          descricao: titulo.descricao,
          data_competencia: titulo.data_competencia,
          valor: valorCompetencia,
          campos_faltantes: uniqueFaltantes,
        });
        continue;
      }

      if (!matchesDimensoes(titulo, filters)) {
        continue;
      }

      const baseOperacional =
        Number(titulo.valor_original) - Number(titulo.desconto);
      const financeira = Number(titulo.juros) + Number(titulo.multa);

      if (tipoDre === "despesa") {
        despesasOperacionais += baseOperacional;
        despesasFinanceiras += financeira;
      } else if (tipoDre === "receita") {
        despesasOperacionais -= baseOperacional;
        receitasFinanceiras += financeira;
      }
    }

    const receitaLiquida = receitaBruta - deducoes;
    const margemContribuicao = receitaLiquida - cmv;
    const ebitda = margemContribuicao - despesasOperacionais;
    const resultadoFinal =
      ebitda - despesasFinanceiras + receitasFinanceiras;

    const resumo: DreResumo = {
      receita_bruta: receitaBruta,
      deducoes,
      receita_liquida: receitaLiquida,
      cmv,
      margem_contribuicao: margemContribuicao,
      despesas_operacionais: despesasOperacionais,
      ebitda,
      resultado_final: resultadoFinal,
      receitas_financeiras: receitasFinanceiras,
      despesas_financeiras: despesasFinanceiras,
    };

    return {
      resumo,
      linhas: buildLinhas(resumo),
      gaps,
      filterOptions,
    };
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
    if (filters.centroCustoId) {
      query = query.eq("centro_custo_id", filters.centroCustoId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ContaPagarRow[];
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
