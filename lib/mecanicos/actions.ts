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
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";

type ActionResult = { success: boolean; error?: string; id?: string };

async function guard(
  tenantSlug: string,
  key: keyof typeof DEFAULT_ROLE_PERMISSIONS.owner,
): Promise<{ tenantId: string; ok: boolean; error?: string }> {
  const tenant = await requireTenant(tenantSlug);
  let ok =
    DEFAULT_ROLE_PERMISSIONS[tenant.role][
      key as keyof (typeof DEFAULT_ROLE_PERMISSIONS)["owner"]
    ] ?? false;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    ok = await perms.has(key as never);
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
    return { success: false, error: e instanceof Error ? e.message : "Erro" };
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
