"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createCompartilhamentoService } from "@/lib/ordens/compartilhamento-service";
import {
  buildInspecaoHtml,
  renderPdfBuffer,
  type InspecaoPdfData,
} from "@/lib/ordens/inspecao-pdf-service";
import { createInspecaoStorageService } from "@/lib/ordens/inspecao-storage-service";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { createOrcamentoVersaoService } from "@/lib/ordens/orcamento-versao-service";
import {
  osAnexoUploadMetaSchema,
  osChecklistUpdateSchema,
  osCompartilharSchema,
  osPublicarOrcamentoSchema,
} from "@/lib/ordens/validations";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateOs(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/ordens`);
  if (id) {
    revalidatePath(`/${tenantSlug}/ordens/${id}`);
  }
}

export async function updateOsChecklistClassificacaoAction(
  tenantSlug: string,
  osId: string,
  checklistId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osChecklistUpdateSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.updateChecklistItem(
      osId,
      checklistId,
      parsed.classificacao,
      parsed.observacao ?? null,
      profile?.id ?? null,
    );
    revalidateOs(tenantSlug, osId);
    return { success: true, id: checklistId };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar checklist.", "ordens.checklist");
  }
}

export async function uploadOsAnexoAction(
  tenantSlug: string,
  formData: FormData,
): Promise<
  | { success: true; id: string }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Arquivo não informado.");
    }

    const metaRaw = {
      ordemServicoId: formData.get("ordemServicoId"),
      etapa: formData.get("etapa"),
      tipo: formData.get("tipo") ?? "foto",
      nomeArquivo: formData.get("nomeArquivo") ?? file.name,
      checklistItemId: formData.get("checklistItemId") ?? undefined,
      diagnosticoId: formData.get("diagnosticoId") ?? undefined,
      legenda: formData.get("legenda") ?? undefined,
      observacao: formData.get("observacao") ?? undefined,
      ordem: formData.get("ordem") ?? undefined,
    };

    const parsed = osAnexoUploadMetaSchema.parse(metaRaw);
    const service = await createInspecaoStorageService(tenant.id);
    const anexo = await service.uploadAnexo(file, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, parsed.ordemServicoId);
    return { success: true, id: anexo.id };
  } catch (error) {
    return toActionError(error, "Erro ao enviar anexo.", "ordens.anexo.upload");
  }
}

export async function deleteOsAnexoAction(
  tenantSlug: string,
  osId: string,
  anexoId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createInspecaoStorageService(tenant.id);
    await service.softDeleteAnexo(anexoId);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: anexoId };
  } catch (error) {
    return toActionError(error, "Erro ao remover anexo.", "ordens.anexo.delete");
  }
}

export async function getOsAnexoSignedUrlAction(
  tenantSlug: string,
  anexoId: string,
): Promise<
  | { success: true; signedUrl: string; expiresIn: number }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createInspecaoStorageService(tenant.id);
    const result = await service.createSignedUrl(anexoId);
    return { success: true, ...result };
  } catch (error) {
    return toActionError(error, "Erro ao gerar URL do anexo.", "ordens.anexo.url");
  }
}

export async function publicarOrcamentoVersaoAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<
  | { success: true; id: string; versao: number }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osPublicarOrcamentoSchema.parse(values);
    const service = await createOrcamentoVersaoService(tenant.id);
    const versao = await service.publishVersion(osId, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: versao.id, versao: versao.versao };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao publicar orçamento.",
      "ordens.orcamento.publicar",
    );
  }
}

export async function criarCompartilhamentoAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<
  | {
      success: true;
      id: string;
      token: string;
      urlPath: string;
      expiraEm: string;
    }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osCompartilharSchema.parse(values);
    const service = await createCompartilhamentoService(tenant.id);
    const share = await service.createShare(osId, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, ...share };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao criar compartilhamento.",
      "ordens.compartilhar",
    );
  }
}

export async function revogarCompartilhamentoAction(
  tenantSlug: string,
  osId: string,
  shareId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createCompartilhamentoService(tenant.id);
    await service.revokeShare(shareId);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: shareId };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao revogar compartilhamento.",
      "ordens.compartilhar.revogar",
    );
  }
}

export async function getInspecaoPdfAction(
  tenantSlug: string,
  osId: string,
  versaoOrcamentoId?: string | null,
): Promise<
  | { success: true; base64: string; filename: string }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const osService = await createOrdemServicoService(tenant.id);
    const os = await osService.getById(osId);
    if (!os) throw new Error("OS não encontrada.");

    const orcamentoService = await createOrcamentoVersaoService(tenant.id);
    let orcamentoDetail = versaoOrcamentoId
      ? await orcamentoService.getVersion(versaoOrcamentoId)
      : null;

    if (!orcamentoDetail) {
      const versoes = await orcamentoService.listVersions(osId);
      const latest = versoes.find((v) => v.status === "publicado") ?? versoes[0];
      if (latest) {
        orcamentoDetail = await orcamentoService.getVersion(latest.id);
      }
    }

    const pdfData: InspecaoPdfData = {
      oficina: { nome: tenant.name ?? "Oficina" },
      os: {
        numero: os.numero,
        dataAbertura: os.data_abertura,
        quilometragem: os.quilometragem_entrada,
        reclamacao: os.reclamacao_cliente,
        status: os.status,
      },
      cliente: { nome: os.cliente_nome ?? "Cliente" },
      veiculo: {
        placa: os.placa,
        modelo: os.modelo,
      },
      checklist: os.checklist.map((item) => ({
        itemLabel: item.item_label,
        classificacao: item.status,
        observacao: item.observacao,
      })),
      diagnosticos: os.diagnosticos.map((d) => ({
        sintoma: (d.sintoma_relatado as string | null) ?? null,
        diagnostico: (d.diagnostico_tecnico as string | null) ?? null,
        causa: (d.causa_provavel as string | null) ?? null,
        recomendacao: (d.recomendacao as string | null) ?? null,
        gravidade: (d.gravidade as string | null) ?? null,
        observacoesCliente: (d.observacoes_cliente as string | null) ?? null,
      })),
      orcamento: orcamentoDetail
        ? {
            versao: orcamentoDetail.versao,
            valorTotal: orcamentoDetail.valor_total,
            subtotal: orcamentoDetail.subtotal,
            descontoTotal: orcamentoDetail.desconto_total,
            acrescimoTotal: orcamentoDetail.acrescimo_total,
            prazoEstimadoDias: orcamentoDetail.prazo_estimado_dias,
            validadeAte: orcamentoDetail.validade_ate,
            avisoTexto: orcamentoDetail.aviso_texto,
            itens: orcamentoDetail.itens.map((item) => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              valorUnitario: item.valor_unitario,
              valorTotal: item.valor_total,
              recomendacao: item.recomendacao,
            })),
          }
        : null,
    };

    const html = buildInspecaoHtml(pdfData);
    const buffer = await renderPdfBuffer(html);
    const base64 = buffer.toString("base64");
    const filename = `inspecao-os-${os.numero}.pdf`;

    return { success: true, base64, filename };
  } catch (error) {
    return toActionError(error, "Erro ao gerar PDF.", "ordens.inspecao.pdf");
  }
}
