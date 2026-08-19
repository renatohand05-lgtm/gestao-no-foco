"use server";

import { revalidatePath } from "next/cache";

import { createMecanicoApontamentoService } from "@/lib/mecanicos/apontamento-service";
import { createMecanicoCompetenciaService } from "@/lib/mecanicos/competencia-service";
import {
  createMecanicoCustoService,
  type MecanicoCustoClassificacaoInput,
  type MecanicoCustoInput,
} from "@/lib/mecanicos/custo-service";
import { assertClassificacaoCustoIds } from "@/lib/mecanicos/classificacao";
import type { MecanicoInput } from "@/lib/mecanicos/mecanico-service";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import type { OsMecanicoPapel } from "@/lib/mecanicos/constants";
import { createOsMecanicoService } from "@/lib/mecanicos/os-mecanico-service";
import { DEFAULT_ROLE_PERMISSIONS, type PermissionKey } from "@/lib/permissoes/constants";
import { getPermission } from "@/lib/permissoes/authorization";
import { requireTenant } from "@/lib/tenants";
import { toActionError } from "@/lib/supabase/friendly-error";

type ActionResult = { success: boolean; error?: string; id?: string };

async function guard(
  tenantSlug: string,
  key: PermissionKey,
): Promise<{ tenantId: string; ok: boolean; error?: string }> {
  const tenant = await requireTenant(tenantSlug);
  let ok = DEFAULT_ROLE_PERMISSIONS[tenant.role][key] ?? false;
  try {
    ok = await getPermission(tenant.id, tenant.role, key);
  } catch {
    /* fallback */
  }
  if (!ok) return { tenantId: tenant.id, ok: false, error: "Sem permissão." };
  return { tenantId: tenant.id, ok: true };
}

export async function createMecanicoAction(
  tenantSlug: string,
  input: MecanicoInput,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "mecanicos.criar");
  if (!g.ok) return { success: false, error: g.error };
  try {
    const svc = await createMecanicoService(g.tenantId);
    const row = await svc.create(input);
    revalidatePath(`/${tenantSlug}/oficina/mecanicos`);
    revalidatePath(`/${tenantSlug}/profissionais`);
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function updateMecanicoAction(
  tenantSlug: string,
  id: string,
  input: Partial<MecanicoInput>,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "mecanicos.editar");
  if (!g.ok) return { success: false, error: g.error };
  try {
    const svc = await createMecanicoService(g.tenantId);
    await svc.update(id, input);
    revalidatePath(`/${tenantSlug}/oficina/mecanicos`);
    revalidatePath(`/${tenantSlug}/oficina/mecanicos/${id}`);
    revalidatePath(`/${tenantSlug}/profissionais`);
    revalidatePath(`/${tenantSlug}/profissionais/${id}`);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function setMecanicoStatusAction(
  tenantSlug: string,
  id: string,
  status: "ativo" | "inativo" | "arquivado",
  motivo?: string,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "mecanicos.editar");
  if (!g.ok) return { success: false, error: g.error };
  try {
    const svc = await createMecanicoService(g.tenantId);
    await svc.setStatus(id, status, motivo);
    revalidatePath(`/${tenantSlug}/oficina/mecanicos`);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function criarCustoVigenciaAction(
  tenantSlug: string,
  mecanicoId: string,
  input: MecanicoCustoInput,
  motivo?: string,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "mecanicos.editar_custo");
  if (!g.ok) return { success: false, error: g.error };
  try {
    assertClassificacaoCustoIds(input);
    const svc = await createMecanicoCustoService(g.tenantId);
    const row = await svc.criarVigencia(mecanicoId, input, motivo);
    revalidatePath(`/${tenantSlug}/oficina/mecanicos/${mecanicoId}`);
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function atualizarClassificacaoCustoAction(
  tenantSlug: string,
  mecanicoId: string,
  custoId: string,
  input: MecanicoCustoClassificacaoInput,
  motivo?: string,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "mecanicos.editar_custo");
  if (!g.ok) return { success: false, error: g.error };
  try {
    assertClassificacaoCustoIds(input);
    const svc = await createMecanicoCustoService(g.tenantId);
    const row = await svc.atualizarClassificacao(custoId, input, motivo);
    revalidatePath(`/${tenantSlug}/oficina/mecanicos/${mecanicoId}`);
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function gerarObrigacaoMecanicoAction(
  tenantSlug: string,
  mecanicoId: string,
  competencia: string,
  dataVencimento?: string | null,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "financeiro.gerar_obrigacao_mecanico");
  if (!g.ok) return { success: false, error: g.error };
  try {
    const svc = await createMecanicoCompetenciaService(g.tenantId);
    const id = await svc.gerar({
      mecanicoId,
      competencia,
      dataVencimento,
    });
    revalidatePath(`/${tenantSlug}/oficina/mecanicos/${mecanicoId}`);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function atribuirMecanicoOsAction(
  tenantSlug: string,
  ordemId: string,
  mecanicoId: string,
  papel: OsMecanicoPapel,
  percentual?: number,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "os.atribuir_mecanico");
  if (!g.ok) return { success: false, error: g.error };
  try {
    const svc = await createOsMecanicoService(g.tenantId);
    const id = await svc.atribuir({
      ordemId,
      mecanicoId,
      papel,
      percentual,
    });
    revalidatePath(`/${tenantSlug}/ordens/${ordemId}`);
    return { success: true, id };
  } catch (e) {
    return toActionError(e, "Não foi possível vincular o mecânico.", "os.atribuir_mecanico");
  }
}

export async function transferirMecanicoOsAction(
  tenantSlug: string,
  ordemId: string,
  deMecanicoId: string,
  paraMecanicoId: string,
  motivo?: string,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "os.transferir_mecanico");
  if (!g.ok) return { success: false, error: g.error };
  try {
    const svc = await createOsMecanicoService(g.tenantId);
    const id = await svc.transferir({
      ordemId,
      deMecanicoId,
      paraMecanicoId,
      motivo,
    });
    revalidatePath(`/${tenantSlug}/ordens/${ordemId}`);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function removerMecanicoOsAction(
  tenantSlug: string,
  ordemId: string,
  alocacaoId: string,
  motivo: string,
): Promise<ActionResult> {
  const g = await guard(tenantSlug, "os.atribuir_mecanico");
  if (!g.ok) return { success: false, error: g.error };
  try {
    const svc = await createOsMecanicoService(g.tenantId);
    await svc.remover({ alocacaoId, motivo });
    revalidatePath(`/${tenantSlug}/ordens/${ordemId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function apontarHorasAction(
  tenantSlug: string,
  params: {
    mecanicoId: string;
    acao: "iniciar" | "pausar" | "retomar" | "finalizar" | "manual";
    ordemId?: string | null;
    inicio?: string | null;
    fim?: string | null;
    motivo?: string | null;
  },
): Promise<ActionResult> {
  const key =
    params.acao === "manual"
      ? "mecanicos.apontar_horas_manual"
      : "mecanicos.apontar_horas";
  const g = await guard(tenantSlug, key);
  if (!g.ok) return { success: false, error: g.error };
  try {
    if (params.ordemId) {
      const { createClient } = await import("@/lib/supabase/server");
      const { canMutateOsExecution, closedOsOperationMessage } = await import(
        "@/lib/ordens/os-status"
      );
      const supabase = await createClient();
      const { data: os, error } = await supabase
        .from("ordens_servico")
        .select("status")
        .eq("id", params.ordemId)
        .eq("tenant_id", g.tenantId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!os) return { success: false, error: "OS não encontrada neste tenant." };
      if (!canMutateOsExecution(String((os as { status: string }).status))) {
        return {
          success: false,
          error: closedOsOperationMessage(String((os as { status: string }).status)),
        };
      }
    }
    const svc = await createMecanicoApontamentoService(g.tenantId);
    const id = await svc.executar(params);
    if (params.ordemId) {
      revalidatePath(`/${tenantSlug}/ordens/${params.ordemId}`);
    }
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
  }
}
