import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const OS_INSPECAO_BUCKET = "os-inspecao";
export const OS_ANEXO_MAX_BYTES = 5 * 1024 * 1024;

export const OS_ANEXO_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type OsAnexoAllowedMime = (typeof OS_ANEXO_ALLOWED_MIME)[number];

const MIME_TO_EXTENSIONS: Record<OsAnexoAllowedMime, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

export type OsAnexoEtapa =
  | "entrada"
  | "diagnostico"
  | "orcamento"
  | "execucao"
  | "conclusao"
  | "entrega"
  | "retorno"
  | "garantia"
  | "sintoma"
  | "causa"
  | "recomendacao"
  | "peca_danificada"
  | "antes_desmontagem"
  | "depois_desmontagem"
  | "outro";

export type OsAnexoUploadMeta = {
  ordemServicoId: string;
  etapa: OsAnexoEtapa;
  tipo?: string;
  nomeArquivo: string;
  checklistItemId?: string | null;
  diagnosticoId?: string | null;
  legenda?: string | null;
  observacao?: string | null;
  ordem?: number;
};

export type OsAnexoRecord = {
  id: string;
  tenant_id: string;
  ordem_servico_id: string;
  etapa: string;
  tipo: string;
  descricao: string | null;
  storage_path: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  checklist_item_id: string | null;
  diagnostico_id: string | null;
  legenda: string | null;
  observacao: string | null;
  ordem: number;
  sha256: string | null;
  deleted_at: string | null;
  created_at: string;
};

function extensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return (parts.pop() ?? "").toLowerCase();
}

function assertMimeAndExtension(mimeType: string, filename: string) {
  if (!OS_ANEXO_ALLOWED_MIME.includes(mimeType as OsAnexoAllowedMime)) {
    throw new Error(
      `Tipo de arquivo não permitido: ${mimeType}. Use JPEG, PNG, WebP ou PDF.`,
    );
  }

  const ext = extensionFromFilename(filename);
  const allowed = MIME_TO_EXTENSIONS[mimeType as OsAnexoAllowedMime];
  if (!ext || !allowed.includes(ext)) {
    throw new Error(
      `Extensão ".${ext || "?"}" incompatível com o tipo ${mimeType}.`,
    );
  }

  return ext;
}

async function bufferFromFile(file: File | Blob): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export class InspecaoStorageService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async uploadAnexo(
    file: File | Blob,
    meta: OsAnexoUploadMeta,
    userId: string | null,
  ): Promise<OsAnexoRecord> {
    const mimeType = file.type || "application/octet-stream";
    const nomeArquivo =
      file instanceof File && file.name ? file.name : meta.nomeArquivo;

    if (!nomeArquivo?.trim()) {
      throw new Error("Informe o nome do arquivo.");
    }

    const ext = assertMimeAndExtension(mimeType, nomeArquivo);
    const size = file.size;

    if (size <= 0) {
      throw new Error("Arquivo vazio.");
    }
    if (size > OS_ANEXO_MAX_BYTES) {
      throw new Error("Arquivo excede o limite de 5 MB.");
    }

    const buffer = await bufferFromFile(file);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const objectId = randomUUID();
    const storagePath = `${this.tenantId}/os/${meta.ordemServicoId}/${objectId}.${ext}`;

    const { error: uploadError } = await this.supabase.storage
      .from(OS_INSPECAO_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Falha no upload: ${uploadError.message}`);
    }

    const { data, error } = await this.supabase
      .from("ordem_servico_anexos" as never)
      .insert({
        tenant_id: this.tenantId,
        ordem_servico_id: meta.ordemServicoId,
        etapa: meta.etapa,
        tipo: meta.tipo ?? "foto",
        descricao: nomeArquivo,
        storage_path: storagePath,
        mime_type: mimeType,
        tamanho_bytes: size,
        checklist_item_id: meta.checklistItemId ?? null,
        diagnostico_id: meta.diagnosticoId ?? null,
        legenda: meta.legenda ?? null,
        observacao: meta.observacao ?? null,
        ordem: meta.ordem ?? 0,
        sha256,
        user_id: userId,
      } as never)
      .select("*")
      .single();

    if (error) {
      await this.supabase.storage
        .from(OS_INSPECAO_BUCKET)
        .remove([storagePath]);
      throw new Error(error.message);
    }

    return data as unknown as OsAnexoRecord;
  }

  async softDeleteAnexo(anexoId: string): Promise<void> {
    const { data, error: fetchError } = await this.supabase
      .from("ordem_servico_anexos" as never)
      .select("id")
      .eq("id", anexoId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!data) throw new Error("Anexo não encontrado.");

    const { error } = await this.supabase
      .from("ordem_servico_anexos" as never)
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", anexoId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async createSignedUrl(
    anexoId: string,
    expiresIn = 120,
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const { data: anexo, error: fetchError } = await this.supabase
      .from("ordem_servico_anexos" as never)
      .select("storage_path")
      .eq("id", anexoId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!anexo) throw new Error("Anexo não encontrado.");

    const storagePath = (anexo as { storage_path: string | null }).storage_path;
    if (!storagePath) {
      throw new Error("Anexo sem caminho de armazenamento.");
    }

    const storageClient = isAdminClientAvailable()
      ? createAdminClient()
      : this.supabase;

    const { data, error } = await storageClient.storage
      .from(OS_INSPECAO_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Não foi possível gerar URL assinada.");
    }

    return { signedUrl: data.signedUrl, expiresIn };
  }

  async listAnexos(osId: string): Promise<OsAnexoRecord[]> {
    const { data, error } = await this.supabase
      .from("ordem_servico_anexos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", osId)
      .is("deleted_at", null)
      .order("ordem")
      .order("created_at");

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as OsAnexoRecord[];
  }
}

export async function createInspecaoStorageService(tenantId: string) {
  const supabase = await createClient();
  return new InspecaoStorageService(supabase, tenantId);
}
