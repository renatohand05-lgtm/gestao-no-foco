"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import type { TenantRole } from "@/lib/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";
import {
  createVendaRapidaService,
  type ProdutoBalcao,
} from "@/lib/vendas/venda-rapida-service";
import {
  vendaDevolucaoFormSchema,
  vendaRapidaFormSchema,
} from "@/lib/vendas/venda-rapida-validations";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

function revalidateBalcao(tenantSlug: string, vendaId?: string) {
  revalidatePath(`/${tenantSlug}/vendas`);
  revalidatePath(`/${tenantSlug}/vendas/rapida`);
  revalidatePath(`/${tenantSlug}/vendas/dashboard`);
  revalidatePath(`/${tenantSlug}/descontos/dashboard`);
  revalidatePath(`/${tenantSlug}/estoque`);
  revalidatePath(`/${tenantSlug}/financeiro/contas-receber`);
  revalidatePath(`/${tenantSlug}/dashboard`);
  if (vendaId) revalidatePath(`/${tenantSlug}/vendas/${vendaId}`);
}

export async function buscarProdutoCodigoAction(
  tenantSlug: string,
  codigo: string,
): Promise<
  | { success: true; produto: ProdutoBalcao | null }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createVendaRapidaService(tenant.id);
    const produto = await service.findProdutoByCodigo(codigo);
    return { success: true, produto };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao buscar produto.",
    };
  }
}

export async function concluirVendaRapidaAction(
  tenantSlug: string,
  values: unknown,
): Promise<
  | (ActionResult & { alerts?: string[]; duplicates?: Array<{ id: string; nome: string; matched_on: string }> })
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const role = tenant.role as TenantRole;
    const perms = await createPermissionService(tenant.id, role);
    await perms.require("venda_rapida.criar");

    const parsed = vendaRapidaFormSchema.parse(values);

    if (parsed.modo_cliente === "nao_identificado") {
      await perms.require("venda_rapida.sem_cliente");
    }

    const allowSaldoNegativo = await perms.has("estoque.saldo_negativo");
    const allowAbaixoMargem = await perms.has("desconto.abaixo_margem");

    const service = await createVendaRapidaService(tenant.id);

    if (parsed.force_create_cliente) {
      await perms.require(
        "os.criar_cliente_forcado",
        "Sem permissão para forçar cliente duplicado.",
      );
    }

    const result = await service.concluir(parsed, {
      userId: profile?.id ?? null,
      role,
      allowSaldoNegativo,
      allowAbaixoMargem,
    });

    if (result.kind === "duplicate") {
      return {
        success: false,
        error: "Possível cadastro duplicado. Use o existente ou revise.",
        duplicates: result.duplicates,
      };
    }

    revalidateBalcao(tenantSlug, result.vendaId);
    return {
      success: true,
      id: result.vendaId,
      alerts: result.alerts,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao concluir venda rápida.",
    };
  }
}

export async function devolverVendaAction(
  tenantSlug: string,
  vendaId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("venda.devolver");

    const parsed = vendaDevolucaoFormSchema.parse(values);
    const supabase = await createClient();

    const { data: venda, error: vErr } = await supabase
      .from("vendas")
      .select("id, status, total")
      .eq("tenant_id", tenant.id)
      .eq("id", vendaId)
      .is("deleted_at", null)
      .maybeSingle();

    if (vErr) throw new Error(vErr.message);
    if (!venda) throw new Error("Venda não encontrada.");
    if (venda.status !== "faturado") {
      throw new Error("Só é possível devolver venda faturada.");
    }

    const { data: devolucao, error: dErr } = await supabase
      .from("venda_devolucoes" as never)
      .insert({
        tenant_id: tenant.id,
        venda_id: vendaId,
        motivo: parsed.motivo,
        observacao: parsed.observacao ?? null,
        valor_total: 0,
        autorizado_por: profile?.id ?? null,
        created_by: profile?.id ?? null,
      } as never)
      .select("id")
      .single();

    if (dErr) throw new Error(dErr.message);

    let valorTotal = 0;
    for (const item of parsed.itens) {
      const { data: vi } = await supabase
        .from("venda_itens")
        .select("id, produto_id, preco_unitario, quantidade, total")
        .eq("id", item.venda_item_id)
        .eq("venda_id", vendaId)
        .maybeSingle();

      if (!vi) throw new Error("Item da venda não encontrado.");
      if (item.quantidade > Number(vi.quantidade)) {
        throw new Error("Quantidade devolvida maior que a vendida.");
      }

      const lineTotal = Number(
        (
          (Number(vi.total) / Number(vi.quantidade)) *
          item.quantidade
        ).toFixed(2),
      );
      valorTotal += lineTotal;

      await supabase.from("venda_devolucao_itens" as never).insert({
        tenant_id: tenant.id,
        devolucao_id: (devolucao as { id: string }).id,
        venda_item_id: item.venda_item_id,
        produto_id: vi.produto_id,
        quantidade: item.quantidade,
        valor_unitario: Number(vi.preco_unitario),
        total: lineTotal,
      } as never);

      if (vi.produto_id) {
        const { data: prod } = await supabase
          .from("produtos")
          .select("estoque_atual")
          .eq("id", vi.produto_id)
          .maybeSingle();

        const anterior = Number(prod?.estoque_atual ?? 0);
        const novo = anterior + item.quantidade;
        await supabase
          .from("produtos")
          .update({ estoque_atual: novo } as never)
          .eq("id", vi.produto_id);

        await supabase.from("estoque_movimentacoes").insert({
          tenant_id: tenant.id,
          produto_id: vi.produto_id,
          tipo: "entrada",
          quantidade: item.quantidade,
          quantidade_anterior: anterior,
          quantidade_nova: novo,
          origem: "devolucao",
          motivo: parsed.motivo,
          observacoes: `Devolução venda ${vendaId}`,
          created_by: profile?.id ?? null,
        } as never);
      }
    }

    await supabase
      .from("venda_devolucoes" as never)
      .update({ valor_total: valorTotal } as never)
      .eq("id", (devolucao as { id: string }).id);

    revalidateBalcao(tenantSlug, vendaId);
    return { success: true, id: (devolucao as { id: string }).id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao registrar devolução.",
    };
  }
}
