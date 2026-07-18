import { createClient } from "@/lib/supabase/server";
import type { DreClassificacaoIncompleta } from "@/types/dre";

type LancamentoIncompletoRow = {
  id: string;
  numero: number;
  descricao: string;
  data_competencia: string;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  plano_conta_id: string | null;
};

function camposFaltantes(row: LancamentoIncompletoRow) {
  const campos: string[] = [];

  if (!row.categoria_financeira_id) campos.push("Categoria financeira");
  if (!row.plano_conta_id) campos.push("Plano de contas");
  if (!row.centro_custo_id) campos.push("Centro de custo");

  return campos;
}

export async function listDreClassificacaoIncompleta(
  tenantId: string,
): Promise<DreClassificacaoIncompleta[]> {
  const supabase = await createClient();
  const select = `
    id,
    numero,
    descricao,
    data_competencia,
    categoria_financeira_id,
    centro_custo_id,
    plano_conta_id
  `;
  const incompleta =
    "categoria_financeira_id.is.null,centro_custo_id.is.null,plano_conta_id.is.null";

  const [receberResult, pagarResult] = await Promise.all([
    supabase
      .from("contas_receber")
      .select(select)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .or(incompleta)
      .order("data_competencia", { ascending: false })
      .limit(100),
    supabase
      .from("contas_pagar")
      .select(select)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .or(incompleta)
      .order("data_competencia", { ascending: false })
      .limit(100),
  ]);

  if (receberResult.error) throw new Error(receberResult.error.message);
  if (pagarResult.error) throw new Error(pagarResult.error.message);

  const receber = (receberResult.data ?? []) as LancamentoIncompletoRow[];
  const pagar = (pagarResult.data ?? []) as LancamentoIncompletoRow[];

  return [
    ...receber.map((row) => ({
      ...row,
      origem: "conta-receber" as const,
      campos_faltantes: camposFaltantes(row),
    })),
    ...pagar.map((row) => ({
      ...row,
      origem: "conta-pagar" as const,
      campos_faltantes: camposFaltantes(row),
    })),
  ].sort((a, b) => b.data_competencia.localeCompare(a.data_competencia));
}
