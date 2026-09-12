"use server";

import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { createClient } from "@/lib/supabase/server";
import { createVendaService } from "@/lib/vendas/venda-service";
import {
  buildVendaReciboHtml,
  renderPdfBuffer,
} from "@/lib/vendas/venda-recibo-pdf-service";
import {
  createReciboSignedUrl,
  sendReciboViaEmail,
  sendReciboViaWhatsapp,
  uploadReciboPdf,
} from "@/lib/vendas/venda-recibo-send-service";
import type { ActionResult } from "@/types/action-result";

export type SendVendaReciboInput = {
  canal: "whatsapp" | "email";
  /** Sobrescreve o telefone/e-mail do cliente cadastrado, se informado. */
  destino?: string;
};

export async function sendVendaReciboAction(
  tenantSlug: string,
  vendaId: string,
  input: SendVendaReciboInput,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      tenantSlug,
      "vendas.visualizar",
    );

    const service = await createVendaService(tenant.id);
    const venda = await service.getById(vendaId);
    if (!venda) {
      throw new Error("Venda não encontrada.");
    }

    const destino =
      input.destino?.trim() ||
      (input.canal === "whatsapp"
        ? (venda.cliente?.telefone ?? undefined)
        : (venda.cliente?.email ?? undefined));

    if (!destino) {
      throw new Error(
        input.canal === "whatsapp"
          ? "O cliente não tem telefone cadastrado — informe um número."
          : "O cliente não tem e-mail cadastrado — informe um endereço.",
      );
    }

    const html = buildVendaReciboHtml({
      empresa: { nome: tenant.name },
      venda: {
        numero: venda.numero,
        dataVenda: venda.data_venda,
        formaPagamento: venda.forma_pagamento_ref?.nome ?? venda.forma_pagamento ?? null,
        observacoes: venda.observacoes,
      },
      cliente: venda.cliente
        ? {
            nome: venda.cliente.nome,
            documento: venda.cliente.documento,
            telefone: venda.cliente.telefone,
          }
        : null,
      itens: venda.itens.map((item) => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        precoUnitario: item.preco_unitario,
        desconto: item.desconto,
        total: item.total,
      })),
      totais: {
        subtotal: venda.subtotal,
        descontoTotal: venda.desconto_total,
        total: venda.total,
      },
    });

    const pdfBuffer = await renderPdfBuffer(html);
    const filename = `recibo-venda-${venda.numero}.pdf`;

    let result: Awaited<ReturnType<typeof sendReciboViaEmail>>;

    if (input.canal === "whatsapp") {
      const supabase = await createClient();
      const { storagePath } = await uploadReciboPdf(
        supabase,
        tenant.id,
        vendaId,
        pdfBuffer,
      );
      const signedUrl = await createReciboSignedUrl(supabase, storagePath);
      result = await sendReciboViaWhatsapp(destino, signedUrl, filename);
    } else {
      result = await sendReciboViaEmail(
        destino,
        pdfBuffer,
        filename,
        `Comprovante da sua compra — ${tenant.name}`,
      );
    }

    if (!result.ok) {
      throw new Error(result.error);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Falha ao enviar o recibo.",
    };
  }
}
