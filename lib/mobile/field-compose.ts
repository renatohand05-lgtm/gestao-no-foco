import "server-only";

/**
 * Sprint 31.8 — Execução em campo (checklist, fotos, assinatura, anexos).
 * Reutiliza OrdemServicoService + InspecaoStorageService + schemas Web.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  InspecaoStorageService,
  type OsAnexoEtapa,
  type OsAnexoRecord,
} from "@/lib/ordens/inspecao-storage-service";
import { OrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import {
  osAnexoUploadMetaSchema,
  osChecklistUpdateSchema,
} from "@/lib/ordens/validations";
import {
  hasPerm,
  resolveOpsDataClient,
} from "@/lib/mobile/operations-compose";
import type { Database } from "@/types/database";

function assertOpsEdit(permissions: readonly string[]) {
  if (
    !hasPerm(permissions, "os.editar") &&
    !hasPerm(permissions, "*")
  ) {
    throw new Error("FORBIDDEN_OPS_EDIT");
  }
}

function assertOpsView(permissions: readonly string[]) {
  if (
    !hasPerm(permissions, "os.visualizar") &&
    !hasPerm(permissions, "*")
  ) {
    throw new Error("FORBIDDEN_OPS");
  }
}

export type MobileFieldGalleryGroup =
  | "antes"
  | "durante"
  | "depois"
  | "documentos"
  | "outras"
  | "assinatura";

export function mapEtapaToGalleryGroup(
  etapa: string,
  tipo: string,
  legenda: string | null,
): MobileFieldGalleryGroup {
  const hay = `${etapa} ${tipo} ${legenda ?? ""}`.toLowerCase();
  if (/assinatura|signature/.test(hay)) return "assinatura";
  if (tipo === "documento" || tipo === "pdf" || /pdf|documento/.test(hay)) {
    return "documentos";
  }
  if (
    etapa === "entrada" ||
    etapa === "antes_desmontagem" ||
    etapa === "sintoma"
  ) {
    return "antes";
  }
  if (
    etapa === "execucao" ||
    etapa === "diagnostico" ||
    etapa === "orcamento" ||
    etapa === "causa"
  ) {
    return "durante";
  }
  if (
    etapa === "conclusao" ||
    etapa === "entrega" ||
    etapa === "depois_desmontagem"
  ) {
    return "depois";
  }
  return "outras";
}

export type MobileFieldAnexo = {
  id: string;
  label: string;
  legenda: string | null;
  etapa: string;
  tipo: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  authorId: string | null;
  group: MobileFieldGalleryGroup;
  checklistItemId: string | null;
  isImage: boolean;
  isPdf: boolean;
  thumbUrl: string | null;
  signedUrl: string | null;
  urlExpiresIn: number | null;
};

export type MobileFieldChecklistItem = {
  id: string;
  codigo: string;
  label: string;
  status: string;
  classificacao: string;
  observacao: string | null;
  categoria: string | null;
  registradoEm: string | null;
  responsavelId: string | null;
  done: boolean;
};

export async function listFieldAnexos(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  osId: string;
  includeSignedUrls?: boolean;
  limit?: number;
}): Promise<MobileFieldAnexo[]> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const storage = new InspecaoStorageService(client, input.tenantId);
  const rows = await storage.listAnexos(input.osId);
  const limit = input.limit ?? 60;
  const sliced = rows.slice(0, limit);

  const mapped: MobileFieldAnexo[] = [];
  for (const p of sliced) {
    const mime = p.mime_type;
    const isImage = Boolean(mime?.startsWith("image/"));
    const isPdf = mime === "application/pdf" || p.tipo === "pdf";
    let signedUrl: string | null = null;
    let urlExpiresIn: number | null = null;
    if (input.includeSignedUrls) {
      try {
        const signed = await storage.createSignedUrl(p.id, 180);
        signedUrl = signed.signedUrl;
        urlExpiresIn = signed.expiresIn;
      } catch {
        signedUrl = null;
      }
    }
    const label = p.legenda || p.descricao || p.tipo || "anexo";
    mapped.push({
      id: p.id,
      label,
      legenda: p.legenda,
      etapa: p.etapa,
      tipo: p.tipo,
      mimeType: mime,
      sizeBytes: p.tamanho_bytes,
      createdAt: p.created_at ?? "",
      authorId: (p as OsAnexoRecord & { user_id?: string | null }).user_id ?? null,
      group: mapEtapaToGalleryGroup(p.etapa, p.tipo, p.legenda),
      checklistItemId: p.checklist_item_id,
      isImage,
      isPdf,
      thumbUrl: isImage ? signedUrl : null,
      signedUrl,
      urlExpiresIn,
    });
  }
  return mapped;
}

export async function listFieldChecklist(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  osId: string;
}): Promise<MobileFieldChecklistItem[]> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const { data, error } = await client
    .from("ordem_servico_checklist" as never)
    .select(
      "id, item_codigo, item_label, status, classificacao, observacao, categoria, registrado_em, responsavel_id, ordem",
    )
    .eq("tenant_id", input.tenantId)
    .eq("ordem_servico_id", input.osId)
    .is("deleted_at", null)
    .order("ordem" as never);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<Record<string, unknown>>).map((c) => {
    const status = String(c.status ?? "nao_verificado");
    const classificacao = String(c.classificacao ?? status);
    const done =
      classificacao === "bom" ||
      classificacao === "atencao" ||
      classificacao === "critico" ||
      classificacao === "nao_aplicavel";
    return {
      id: String(c.id),
      codigo: String(c.item_codigo ?? ""),
      label: String(c.item_label ?? ""),
      status,
      classificacao,
      observacao: (c.observacao as string | null) ?? null,
      categoria: (c.categoria as string | null) ?? null,
      registradoEm: (c.registrado_em as string | null) ?? null,
      responsavelId: (c.responsavel_id as string | null) ?? null,
      done,
    };
  });
}

export async function updateFieldChecklistItem(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  osId: string;
  checklistId: string;
  classificacao: string;
  observacao?: string | null;
  userId: string | null;
}): Promise<{ id: string }> {
  assertOpsEdit(input.permissions);
  const parsed = osChecklistUpdateSchema.parse({
    classificacao: input.classificacao,
    observacao: input.observacao ?? null,
  });
  const client = resolveOpsDataClient(input.client);
  const svc = new OrdemServicoService(client, input.tenantId);
  await svc.updateChecklistItem(
    input.osId,
    input.checklistId,
    parsed.classificacao,
    parsed.observacao ?? null,
    input.userId,
  );
  return { id: input.checklistId };
}

export async function uploadFieldAnexo(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  userId: string | null;
  file: Blob;
  meta: {
    ordemServicoId: string;
    etapa: string;
    tipo?: string;
    nomeArquivo: string;
    checklistItemId?: string | null;
    legenda?: string | null;
    observacao?: string | null;
  };
}): Promise<{ id: string }> {
  assertOpsEdit(input.permissions);
  const parsed = osAnexoUploadMetaSchema.parse({
    ordemServicoId: input.meta.ordemServicoId,
    etapa: input.meta.etapa,
    tipo: input.meta.tipo ?? "foto",
    nomeArquivo: input.meta.nomeArquivo,
    checklistItemId: input.meta.checklistItemId ?? undefined,
    legenda: input.meta.legenda ?? undefined,
    observacao: input.meta.observacao ?? undefined,
  });
  const client = resolveOpsDataClient(input.client);
  const storage = new InspecaoStorageService(client, input.tenantId);
  const anexo = await storage.uploadAnexo(
    input.file,
    {
      ...parsed,
      etapa: parsed.etapa as OsAnexoEtapa,
    },
    input.userId,
  );
  return { id: anexo.id };
}

export async function deleteFieldAnexo(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  anexoId: string;
}): Promise<{ id: string }> {
  assertOpsEdit(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const storage = new InspecaoStorageService(client, input.tenantId);
  await storage.softDeleteAnexo(input.anexoId);
  return { id: input.anexoId };
}

export async function getFieldAnexoSignedUrl(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  anexoId: string;
  expiresIn?: number;
}): Promise<{ signedUrl: string; expiresIn: number }> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const storage = new InspecaoStorageService(client, input.tenantId);
  return storage.createSignedUrl(input.anexoId, input.expiresIn ?? 180);
}

/** Assinatura digital = PNG anexo etapa entrega (sem schema novo). */
export async function uploadFieldSignature(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  userId: string | null;
  osId: string;
  file: Blob;
  nomeArquivo?: string;
}): Promise<{ id: string }> {
  return uploadFieldAnexo({
    client: input.client,
    tenantId: input.tenantId,
    permissions: input.permissions,
    userId: input.userId,
    file: input.file,
    meta: {
      ordemServicoId: input.osId,
      etapa: "entrega",
      tipo: "foto",
      nomeArquivo: input.nomeArquivo ?? "assinatura-cliente.png",
      legenda: "Assinatura do cliente",
      observacao: "Captura mobile — evidência de aceite (não certificado jurídico)",
    },
  });
}
