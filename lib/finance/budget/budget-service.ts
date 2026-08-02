/**
 * Sprint 28.9 — CRUD orçamento empresarial (`finance_budgets`).
 * Não altera DRE/Fluxo. Realizado continua leitura canônica.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const FINANCE_BUDGET_STATUSES = [
  "rascunho",
  "em_revisao",
  "aprovado",
  "reprovado",
  "cancelado",
  "encerrado",
] as const;

export type FinanceBudgetStatus = (typeof FINANCE_BUDGET_STATUSES)[number];

export const FINANCE_BUDGET_NATUREZAS = [
  "receita",
  "custo",
  "despesa",
  "investimento",
  "divida",
  "caixa",
] as const;

export type FinanceBudgetRow =
  Database["public"]["Tables"]["finance_budgets"]["Row"];
export type FinanceBudgetLineRow =
  Database["public"]["Tables"]["finance_budget_lines"]["Row"];

export type FinanceBudgetInput = {
  nome: string;
  ano: number;
  observacao?: string | null;
  filial_id?: string | null;
  empresa_id?: string | null;
};

export type FinanceBudgetLineInput = {
  mes: number;
  natureza: (typeof FINANCE_BUDGET_NATUREZAS)[number];
  valor_orcado: number | null;
  justificativa?: string | null;
  centro_custo_id?: string | null;
  centro_resultado_id?: string | null;
  categoria_id?: string | null;
  plano_conta_id?: string | null;
};

const EDITABLE: FinanceBudgetStatus[] = ["rascunho", "em_revisao", "reprovado"];

function labelStatus(status: string): string {
  const map: Record<string, string> = {
    rascunho: "Rascunho",
    em_revisao: "Em revisão",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    cancelado: "Cancelado",
    encerrado: "Encerrado / arquivado",
  };
  return map[status] ?? status;
}

export { labelStatus as labelFinanceBudgetStatus };

export class FinanceBudgetService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(limit = 50): Promise<FinanceBudgetRow[]> {
    const { data, error } = await this.supabase
      .from("finance_budgets")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("ano", { ascending: false })
      .order("versao", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getById(id: string): Promise<{
    budget: FinanceBudgetRow;
    lines: FinanceBudgetLineRow[];
  } | null> {
    const { data, error } = await this.supabase
      .from("finance_budgets")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const linesRes = await this.supabase
      .from("finance_budget_lines")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("budget_id", id)
      .is("deleted_at", null)
      .order("mes", { ascending: true });
    if (linesRes.error) throw new Error(linesRes.error.message);

    return { budget: data, lines: linesRes.data ?? [] };
  }

  async nextVersao(ano: number): Promise<number> {
    const { data, error } = await this.supabase
      .from("finance_budgets")
      .select("versao")
      .eq("tenant_id", this.tenantId)
      .eq("ano", ano)
      .is("deleted_at", null)
      .order("versao", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return (data?.[0]?.versao ?? 0) + 1;
  }

  async create(
    input: FinanceBudgetInput,
    userId: string | null,
    lines: FinanceBudgetLineInput[] = [],
  ): Promise<FinanceBudgetRow> {
    const versao = await this.nextVersao(input.ano);
    const { data, error } = await this.supabase
      .from("finance_budgets")
      .insert({
        tenant_id: this.tenantId,
        nome: input.nome.trim(),
        ano: input.ano,
        versao,
        status: "rascunho",
        observacao: input.observacao?.trim() || null,
        filial_id: input.filial_id || null,
        empresa_id: input.empresa_id || null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (lines.length > 0) {
      await this.replaceLines(data.id, lines);
    }
    return data;
  }

  async update(
    id: string,
    input: FinanceBudgetInput,
    lines?: FinanceBudgetLineInput[],
  ): Promise<FinanceBudgetRow> {
    const current = await this.requireEditable(id);
    const { data, error } = await this.supabase
      .from("finance_budgets")
      .update({
        nome: input.nome.trim(),
        ano: input.ano,
        observacao: input.observacao?.trim() || null,
        filial_id: input.filial_id || null,
        empresa_id: input.empresa_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", current.id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (lines) await this.replaceLines(id, lines);
    return data;
  }

  async duplicate(id: string, userId: string | null): Promise<FinanceBudgetRow> {
    const full = await this.getById(id);
    if (!full) throw new Error("Orçamento não encontrado neste tenant.");
    const copy = await this.create(
      {
        nome: `${full.budget.nome} (cópia)`,
        ano: full.budget.ano,
        observacao: full.budget.observacao,
        filial_id: full.budget.filial_id,
        empresa_id: full.budget.empresa_id,
      },
      userId,
      full.lines.map((l) => ({
        mes: l.mes,
        natureza: (FINANCE_BUDGET_NATUREZAS.includes(
          l.natureza as (typeof FINANCE_BUDGET_NATUREZAS)[number],
        )
          ? l.natureza
          : "despesa") as FinanceBudgetLineInput["natureza"],
        valor_orcado: l.valor_orcado,
        justificativa: l.justificativa,
        centro_custo_id: l.centro_custo_id,
        centro_resultado_id: l.centro_resultado_id,
        categoria_id: l.categoria_id,
        plano_conta_id: l.plano_conta_id,
      })),
    );
    return copy;
  }

  async setStatus(
    id: string,
    status: FinanceBudgetStatus,
    userId: string | null,
  ): Promise<FinanceBudgetRow> {
    const full = await this.getById(id);
    if (!full) throw new Error("Orçamento não encontrado neste tenant.");
    const current = full.budget.status as FinanceBudgetStatus;

    const allowed: Record<FinanceBudgetStatus, FinanceBudgetStatus[]> = {
      rascunho: ["em_revisao", "cancelado"],
      em_revisao: ["aprovado", "reprovado", "rascunho", "cancelado"],
      aprovado: ["encerrado", "cancelado"],
      reprovado: ["rascunho", "em_revisao", "cancelado"],
      cancelado: [],
      encerrado: [],
    };

    if (!allowed[current]?.includes(status)) {
      throw new Error(
        `Transição inválida: ${labelStatus(current)} → ${labelStatus(status)}.`,
      );
    }

    const patch: Database["public"]["Tables"]["finance_budgets"]["Update"] = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "aprovado") {
      patch.aprovado_por = userId;
      patch.aprovado_em = new Date().toISOString();
    }
    if (status === "reprovado" || status === "cancelado") {
      patch.aprovado_por = null;
      patch.aprovado_em = null;
    }

    const { data, error } = await this.supabase
      .from("finance_budgets")
      .update(patch)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const full = await this.getById(id);
    if (!full) throw new Error("Orçamento não encontrado neste tenant.");
    if (full.budget.status === "aprovado") {
      throw new Error("Orçamento aprovado não pode ser excluído. Arquive-o.");
    }
    const { error } = await this.supabase
      .from("finance_budgets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }

  /** Exportação estruturada (JSON) — sem inventar valores. */
  async exportPayload(id: string) {
    const full = await this.getById(id);
    if (!full) throw new Error("Orçamento não encontrado neste tenant.");
    return {
      ...full.budget,
      status_label: labelStatus(full.budget.status),
      lines: full.lines.map((l) => ({
        ...l,
        valor_orcado:
          l.valor_orcado == null ? null : Number(l.valor_orcado),
      })),
      exported_at: new Date().toISOString(),
      note: "Realizado não persiste nesta tabela — use DRE/Fluxo canônicos.",
    };
  }

  private async requireEditable(id: string): Promise<FinanceBudgetRow> {
    const full = await this.getById(id);
    if (!full) throw new Error("Orçamento não encontrado neste tenant.");
    if (!EDITABLE.includes(full.budget.status as FinanceBudgetStatus)) {
      throw new Error(
        `Orçamento ${labelStatus(full.budget.status)} não é editável.`,
      );
    }
    return full.budget;
  }

  private async replaceLines(
    budgetId: string,
    lines: FinanceBudgetLineInput[],
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.supabase
      .from("finance_budget_lines")
      .update({ deleted_at: now })
      .eq("tenant_id", this.tenantId)
      .eq("budget_id", budgetId)
      .is("deleted_at", null);

    if (lines.length === 0) return;

    const rows = lines.map((l) => ({
      tenant_id: this.tenantId,
      budget_id: budgetId,
      mes: l.mes,
      natureza: l.natureza,
      // null permanece null — ausência ≠ zero
      valor_orcado: l.valor_orcado == null ? 0 : Number(l.valor_orcado),
      justificativa: l.justificativa?.trim() || null,
      centro_custo_id: l.centro_custo_id || null,
      centro_resultado_id: l.centro_resultado_id || null,
      categoria_id: l.categoria_id || null,
      plano_conta_id: l.plano_conta_id || null,
    }));

    // Schema exige numeric not null default 0 — linhas omitidas não são criadas.
    // Se valor_orcado veio null no input, persistimos 0 apenas porque a coluna
    // é NOT NULL; a UI deve omitir a linha em vez de enviar null.
    const { error } = await this.supabase
      .from("finance_budget_lines")
      .insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function createFinanceBudgetService(tenantId: string) {
  const supabase = await createClient();
  return new FinanceBudgetService(supabase, tenantId);
}
