"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import type { TenantRole } from "@/lib/constants";
import { createDescontoService } from "@/lib/descontos/desconto-service";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

export async function listDescontosPendentesAction(tenantSlug: string) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("desconto_eventos")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { success: true as const, eventos: data ?? [] };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erro ao listar.",
      eventos: [],
    };
  }
}

export async function decidirDescontoAction(
  tenantSlug: string,
  eventoId: string,
  decisao: "aprovar" | "rejeitar",
  motivo?: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const role = tenant.role as TenantRole;
    const perms = await createPermissionService(tenant.id, role);
    await perms.require("desconto.aprovar");

    const supabase = await createClient();
    const { data: evento, error } = await supabase
      .from("desconto_eventos")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("id", eventoId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!evento) throw new Error("Solicitação não encontrada.");
    if (evento.status !== "pendente") {
      throw new Error("Solicitação já decidida.");
    }

    const novoStatus = decisao === "aprovar" ? "aprovado" : "rejeitado";
    const { error: uErr } = await supabase
      .from("desconto_eventos")
      .update({
        status: novoStatus,
        autorizador_id: profile?.id ?? null,
        cargo_autorizador: role,
        observacao: motivo?.trim() || evento.observacao,
      })
      .eq("id", eventoId)
      .eq("tenant_id", tenant.id);

    if (uErr) throw new Error(uErr.message);

    if (evento.entidade_tipo === "os") {
      await supabase
        .from("ordens_servico")
        .update({
          desconto_status: decisao === "aprovar" ? "aprovado" : "rejeitado",
          desconto_autorizado_por: profile?.id ?? null,
          desconto_autorizado_em: new Date().toISOString(),
          desconto_valor:
            decisao === "aprovar" ? evento.valor_desconto : 0,
          desconto_total:
            decisao === "aprovar" ? evento.valor_desconto : 0,
          valor_total:
            decisao === "aprovar"
              ? evento.valor_final
              : evento.valor_original,
        })
        .eq("id", evento.entidade_id)
        .eq("tenant_id", tenant.id);
    }

    if (evento.entidade_tipo === "venda") {
      await supabase
        .from("vendas")
        .update({
          desconto_total:
            decisao === "aprovar" ? evento.valor_desconto : 0,
          total:
            decisao === "aprovar"
              ? evento.valor_final
              : evento.valor_original,
          desconto_autorizado_por: profile?.id ?? null,
        })
        .eq("id", evento.entidade_id)
        .eq("tenant_id", tenant.id);
    }

    const descontoSvc = await createDescontoService(tenant.id);
    await descontoSvc.recordEvent({
      entidadeTipo: evento.entidade_tipo as "os" | "venda",
      entidadeId: evento.entidade_id,
      clienteId: evento.cliente_id,
      solicitanteId: evento.solicitante_id,
      autorizadorId: profile?.id ?? null,
      cargoAutorizador: role,
      valorOriginal: Number(evento.valor_original),
      valorDesconto: Number(evento.valor_desconto),
      percentual: Number(evento.percentual),
      valorFinal: Number(evento.valor_final),
      margemAntes: evento.margem_antes,
      margemDepois: evento.margem_depois,
      tipoDesconto: evento.tipo_desconto,
      motivo: motivo?.trim() || evento.motivo,
      status: novoStatus,
      observacao: `Decisão: ${decisao}`,
      payload: { evento_origem_id: eventoId },
    });

    revalidatePath(`/${tenantSlug}/descontos/aprovacoes`);
    revalidatePath(`/${tenantSlug}/descontos/dashboard`);
    if (evento.entidade_tipo === "os") {
      revalidatePath(`/${tenantSlug}/ordens/${evento.entidade_id}`);
    } else {
      revalidatePath(`/${tenantSlug}/vendas/${evento.entidade_id}`);
    }

    return { success: true, id: eventoId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao decidir desconto.",
    };
  }
}
