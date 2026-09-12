"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  buildPropostaHtml,
  renderPdfBuffer,
} from "@/lib/crm/proposta-pdf-service";
import {
  createPropostaSignedUrl,
  sendPropostaViaEmail,
  sendPropostaViaWhatsapp,
  uploadPropostaPdf,
} from "@/lib/crm/proposta-send-service";
import {
  createProposta,
  getPropostaWithCliente,
  listPropostas,
  updatePropostaStatus,
  type CreatePropostaInput,
} from "@/lib/crm/proposta-service";
import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { requireTenant } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ActionResultWith } from "@/types/action-result";

export async function createPropostaAction(
  tenantSlug: string,
  input: CreatePropostaInput,
): Promise<ActionResultWith<{ propostaId: string }>> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.criar");
    const profile = await getCurrentProfile();
    const client = await createClient();

    const propostaId = await createProposta(client, tenant.id, input, profile?.id ?? null);

    revalidatePath(`/${tenantSlug}/crm/propostas`);
    return { success: true, propostaId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao criar a proposta.",
    };
  }
}

export async function listPropostasAction(tenantSlug: string, oportunidadeId?: string) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const propostas = await listPropostas(client, tenant.id, oportunidadeId);
    return { success: true as const, data: propostas };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao listar propostas.",
    };
  }
}

/** Gera o PDF, sobe pro storage e manda por WhatsApp ou e-mail — tudo num passo. */
export async function sendPropostaAction(
  tenantSlug: string,
  propostaId: string,
  input: { canal: "whatsapp" | "email"; destino?: string },
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.editar");
    const client = await createClient();

    const found = await getPropostaWithCliente(client, tenant.id, propostaId);
    if (!found) throw new Error("Proposta não encontrada.");

    const destino =
      input.destino?.trim() ||
      (input.canal === "whatsapp"
        ? (found.cliente.telefone ?? undefined)
        : (found.cliente.email ?? undefined));

    if (!destino) {
      throw new Error(
        input.canal === "whatsapp"
          ? "Cliente sem telefone cadastrado — informe um número."
          : "Cliente sem e-mail cadastrado — informe um endereço.",
      );
    }

    const html = buildPropostaHtml({
      empresa: { nome: tenant.name },
      proposta: {
        titulo: found.proposta.titulo,
        numero: found.proposta.id.slice(0, 8),
        dataEmissao: found.proposta.createdAt,
        validadeDias: found.proposta.validadeDias,
        condicoesPagamento: found.proposta.condicoesPagamento,
      },
      cliente: { nome: found.cliente.nome, documento: found.cliente.documento },
      itens: found.proposta.itens.map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
      })),
      valorTotal: found.proposta.valorTotal,
    });

    const pdfBuffer = await renderPdfBuffer(html);
    const filename = `proposta-${found.proposta.id.slice(0, 8)}.pdf`;

    let result: Awaited<ReturnType<typeof sendPropostaViaEmail>>;

    if (input.canal === "whatsapp") {
      const { storagePath } = await uploadPropostaPdf(
        client,
        tenant.id,
        propostaId,
        pdfBuffer,
      );
      const signedUrl = await createPropostaSignedUrl(client, storagePath);
      result = await sendPropostaViaWhatsapp(destino, signedUrl, filename);
      if (result.ok) {
        await updatePropostaStatus(client, tenant.id, propostaId, "enviada", storagePath);
      }
    } else {
      result = await sendPropostaViaEmail(
        destino,
        pdfBuffer,
        filename,
        `Proposta comercial — ${tenant.name}`,
      );
      if (result.ok) {
        await updatePropostaStatus(client, tenant.id, propostaId, "enviada");
      }
    }

    if (!result.ok) throw new Error(result.error);

    revalidatePath(`/${tenantSlug}/crm/propostas`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao enviar a proposta.",
    };
  }
}

export async function markPropostaDecisionAction(
  tenantSlug: string,
  propostaId: string,
  status: "aceita" | "recusada",
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.editar");
    const client = await createClient();
    await updatePropostaStatus(client, tenant.id, propostaId, status);

    revalidatePath(`/${tenantSlug}/crm/propostas`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao atualizar a proposta.",
    };
  }
}
