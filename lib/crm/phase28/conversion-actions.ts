"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { createConversionService } from "@/lib/crm/phase28/conversion-service";
import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateConversion(
  tenantSlug: string,
  paths: string[],
) {
  for (const p of paths) {
    revalidatePath(p.startsWith("/") ? p : `/${tenantSlug}/${p}`);
  }
}

export async function convertOportunidadeToOrcamentoAction(
  tenantSlug: string,
  oportunidadeId: string,
): Promise<ActionResult & { redirectPath?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const svc = await createConversionService(tenant.id, tenantSlug);
    const res = await svc.oportunidadeToOrcamento(
      oportunidadeId,
      user?.id ?? null,
    );
    if (!res.ok) {
      return { success: false, error: res.message };
    }
    revalidateConversion(tenantSlug, [
      "crm/oportunidades",
      "vendas",
      res.redirectPath ?? "",
    ]);
    return {
      success: true,
      id: res.id,
      redirectPath: res.redirectPath,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro na conversão oportunidade → orçamento.",
    };
  }
}

export async function convertOrcamentoToVendaAction(
  tenantSlug: string,
  vendaId: string,
): Promise<ActionResult & { redirectPath?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const svc = await createConversionService(tenant.id, tenantSlug);
    const res = await svc.orcamentoToVenda(vendaId);
    if (!res.ok) return { success: false, error: res.message };
    revalidateConversion(tenantSlug, ["vendas", res.redirectPath ?? ""]);
    return { success: true, id: res.id, redirectPath: res.redirectPath };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro na conversão orçamento → venda.",
    };
  }
}

export async function convertOrcamentoToOsAction(
  tenantSlug: string,
  vendaId: string,
): Promise<ActionResult & { redirectPath?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const svc = await createConversionService(tenant.id, tenantSlug);
    const res = await svc.orcamentoToOs(vendaId, profile?.id ?? null);
    if (!res.ok) return { success: false, error: res.message };
    revalidateConversion(tenantSlug, [
      "vendas",
      "ordens",
      res.redirectPath ?? "",
    ]);
    return { success: true, id: res.id, redirectPath: res.redirectPath };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro na conversão orçamento → OS.",
    };
  }
}

export async function convertAgendaToTarefaAction(
  tenantSlug: string,
  eventId: string,
): Promise<ActionResult & { redirectPath?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const svc = await createConversionService(tenant.id, tenantSlug);
    const res = await svc.agendaToTarefa(eventId, profile?.id ?? null);
    if (!res.ok) return { success: false, error: res.message };
    revalidateConversion(tenantSlug, ["agenda", res.redirectPath ?? ""]);
    return { success: true, id: res.id, redirectPath: res.redirectPath };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro na conversão agenda → tarefa.",
    };
  }
}

export async function convertAgendaToOsAction(
  tenantSlug: string,
  eventId: string,
): Promise<ActionResult & { redirectPath?: string }> {
  return startAttendanceFromAgendaAction(tenantSlug, eventId, "start");
}

export async function startAttendanceFromAgendaAction(
  tenantSlug: string,
  eventId: string,
  mode: "arrived" | "start" = "start",
): Promise<ActionResult & { redirectPath?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const ui = getSegmentUiCopy({
      segment: tenant.segment,
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
    });
    await requireTenantMutationPermission(tenantSlug, [
      "agenda.editar",
      "crm.editar",
    ]);
    if (ui.createsWorkOrderFromAgenda) {
      await requireTenantMutationPermission(tenantSlug, "os.criar");
    }
    const svc = await createConversionService(tenant.id, tenantSlug);
    const res = await svc.agendaToOs(
      eventId,
      profile?.id ?? null,
      {
        segment: tenant.segment,
        segmentVersion: tenant.segment_version,
        segmentConfig: tenant.segment_config,
      },
      mode,
    );
    if (!res.ok) return { success: false, error: res.message };
    revalidateConversion(tenantSlug, [
      "agenda",
      "ordens",
      res.redirectPath ?? "",
    ]);
    return {
      success: true,
      id: res.id,
      redirectPath: res.redirectPath,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao iniciar atendimento a partir da agenda.",
    };
  }
}
