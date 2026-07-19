import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import {
  collectPlanoContaDescendantIds,
} from "@/lib/financeiro/plano-conta-tree";
import { buildPlanoContaPayload } from "@/lib/financeiro/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CreatePlanoContaInput,
  ListPlanoContasParams,
  PaginatedResult,
  PlanoConta,
  PlanoContaListItem,
  PlanoContaNatureza,
  PlanoContaResumo,
  PlanoContaSortField,
  PlanoContaTipo,
  PlanoContaTreeItem,
  SortOrder,
  UpdatePlanoContaInput,
} from "@/types/financeiro";

const LIST_SELECT =
  "id, codigo, nome, tipo, natureza, aceita_lancamento, ordem, ativo, created_at";

const TREE_SELECT =
  "id, codigo, nome, tipo, natureza, aceita_lancamento, ordem, ativo, created_at, conta_pai_id";

function resolveSort(
  sort?: PlanoContaSortField,
  order?: SortOrder,
): { column: PlanoContaSortField; ascending: boolean } {
  const allowed: PlanoContaSortField[] = [
    "codigo",
    "nome",
    "tipo",
    "natureza",
    "ativo",
    "created_at",
  ];
  const column = allowed.includes(sort ?? "codigo")
    ? (sort ?? "codigo")
    : "codigo";
  const ascending = order === "asc" || !order;

  return { column, ascending };
}

function mapUniqueViolation(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Já existe uma conta com este código.";
  }
  return error.message;
}

export class PlanoContaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listForTree(
    params: Omit<ListPlanoContasParams, "page" | "perPage" | "sort" | "order"> = {},
  ): Promise<PlanoContaTreeItem[]> {
    let query = this.supabase
      .from("plano_contas")
      .select(TREE_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("codigo", { ascending: true });

    if (params.tipo && params.tipo !== "all") {
      query = query.eq("tipo", params.tipo as PlanoContaTipo);
    }

    if (params.natureza && params.natureza !== "all") {
      query = query.eq("natureza", params.natureza as PlanoContaNatureza);
    }

    if (params.ativo !== undefined && params.ativo !== "all") {
      query = query.eq("ativo", params.ativo);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data ?? []) as PlanoContaTreeItem[];
  }

  async listParentOptions(excludeId?: string): Promise<PlanoContaTreeItem[]> {
    const items = await this.listForTree({ ativo: true });

    if (!excludeId) {
      return items;
    }

    const descendants = collectPlanoContaDescendantIds(items, excludeId);
    const blocked = new Set([excludeId, ...descendants]);

    return items.filter((item) => !blocked.has(item.id));
  }

  async getResumoById(id: string): Promise<PlanoContaResumo | null> {
    const { data, error } = await this.supabase
      .from("plano_contas")
      .select("id, codigo, nome")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as PlanoContaResumo | null) ?? null;
  }

  private async assertValidParent(
    contaId: string | null | undefined,
    currentId?: string,
  ) {
    if (!contaId) return;

    if (currentId && contaId === currentId) {
      throw new Error("Uma conta não pode ser pai dela mesma.");
    }

    const parent = await this.getById(contaId);
    if (!parent) {
      throw new Error("Conta pai não encontrada.");
    }

    if (currentId) {
      const treeItems = await this.listForTree();
      const descendants = collectPlanoContaDescendantIds(treeItems, currentId);
      if (descendants.includes(contaId)) {
        throw new Error("Não é possível definir uma conta filha como pai.");
      }
    }
  }

  async list(
    params: ListPlanoContasParams = {},
  ): Promise<PaginatedResult<PlanoContaListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? FINANCEIRO_DEFAULT_PER_PAGE, 1),
      FINANCEIRO_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("plano_contas")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      query = query.or(
        [`codigo.ilike.%${search}%`, `nome.ilike.%${search}%`].join(","),
      );
    }

    if (params.tipo && params.tipo !== "all") {
      query = query.eq("tipo", params.tipo as PlanoContaTipo);
    }

    if (params.natureza && params.natureza !== "all") {
      query = query.eq("natureza", params.natureza as PlanoContaNatureza);
    }

    if (params.ativo !== undefined && params.ativo !== "all") {
      query = query.eq("ativo", params.ativo);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;

    return {
      data: (data ?? []) as PlanoContaListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async listOptions(): Promise<Pick<PlanoConta, "id" | "codigo" | "nome">[]> {
    const { data, error } = await this.supabase
      .from("plano_contas")
      .select("id, codigo, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("codigo", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as Pick<PlanoConta, "id" | "codigo" | "nome">[];
  }

  async getById(id: string): Promise<PlanoConta | null> {
    const { data, error } = await this.supabase
      .from("plano_contas")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as PlanoConta | null) ?? null;
  }

  async create(input: CreatePlanoContaInput): Promise<PlanoConta> {
    await this.assertValidParent(input.conta_pai_id);

    const { data, error } = await this.supabase
      .from("plano_contas")
      .insert({
        tenant_id: this.tenantId,
        ...buildPlanoContaPayload(input),
      })
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as PlanoConta;
  }

  async update(id: string, input: UpdatePlanoContaInput): Promise<PlanoConta> {
    await this.assertValidParent(input.conta_pai_id, id);

    const { data, error } = await this.supabase
      .from("plano_contas")
      .update(buildPlanoContaPayload(input as CreatePlanoContaInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as PlanoConta;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("plano_contas")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async applySuggestedDreLinhas(): Promise<{
    updated: number;
    pending: Array<{ id: string; nome: string; codigo: string }>;
  }> {
    const { suggestDreClassificationFromName } = await import("@/lib/dre");
    const { data, error } = await this.supabase
      .from("plano_contas")
      .select("id, nome, codigo, dre_linha, dre_detalhe")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("tipo", ["receita", "despesa"]);

    if (error) throw new Error(error.message);

    let updated = 0;
    const pending: Array<{ id: string; nome: string; codigo: string }> = [];
    const now = new Date().toISOString();

    for (const row of data ?? []) {
      if (row.dre_linha) continue;
      const suggested = suggestDreClassificationFromName(
        `${row.nome} ${row.codigo}`,
      );
      if (!suggested) {
        pending.push({ id: row.id, nome: row.nome, codigo: row.codigo });
        continue;
      }
      const { error: updError } = await this.supabase
        .from("plano_contas")
        .update({
          dre_linha: suggested.linha,
          dre_detalhe: suggested.detalhe,
          dre_classificacao_origem: "sugestao_nome",
          dre_classificacao_em: now,
        } as never)
        .eq("tenant_id", this.tenantId)
        .eq("id", row.id)
        .is("deleted_at", null)
        .is("dre_linha", null);

      if (updError) throw new Error(updError.message);
      updated += 1;
    }

    return { updated, pending };
  }

  async applyClassification(input: {
    id: string;
    linha: string;
    detalhe: string | null;
    origem: "manual" | "sugestao_nome" | "lote";
  }): Promise<void> {
    const { error } = await this.supabase
      .from("plano_contas")
      .update({
        dre_linha: input.linha,
        dre_detalhe: input.detalhe,
        dre_classificacao_origem: input.origem,
        dre_classificacao_em: new Date().toISOString(),
      } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", input.id)
      .is("deleted_at", null)
      .is("dre_linha", null);

    if (error) throw new Error(error.message);
  }
}

export async function createPlanoContaService(tenantId: string) {
  const supabase = await createClient();
  return new PlanoContaService(supabase, tenantId);
}
