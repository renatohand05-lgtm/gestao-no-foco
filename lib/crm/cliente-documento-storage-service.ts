import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ClienteDocumento } from "@/types/crm";

export const CLIENTE_DOCUMENTOS_BUCKET = "cliente-documentos";
export const CLIENTE_DOC_MAX_BYTES = 10 * 1024 * 1024;

export const CLIENTE_DOC_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

type AllowedMime = (typeof CLIENTE_DOC_ALLOWED_MIME)[number];

const MIME_TO_EXT: Record<AllowedMime, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

function extensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return (parts.pop() ?? "").toLowerCase();
}

function assertMime(mimeType: string, filename: string) {
  if (!CLIENTE_DOC_ALLOWED_MIME.includes(mimeType as AllowedMime)) {
    throw new Error(`Tipo não permitido: ${mimeType}. Use JPEG, PNG, WebP ou PDF.`);
  }
  const ext = extensionFromFilename(filename);
  const allowed = MIME_TO_EXT[mimeType as AllowedMime];
  if (!ext || !allowed.includes(ext)) {
    throw new Error(`Extensão ".${ext || "?"}" incompatível com ${mimeType}.`);
  }
  return ext;
}

export class ClienteDocumentoStorageService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async listByCliente(clienteId: string): Promise<ClienteDocumento[]> {
    const { data, error } = await this.supabase
      .from("cliente_documentos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      if (/cliente_documentos|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as ClienteDocumento[];
  }

  async upload(
    file: File | Blob,
    meta: {
      clienteId: string;
      categoria: string;
      legenda?: string | null;
      descricao?: string | null;
      referencia_tipo?: string | null;
      referencia_id?: string | null;
    },
    userId: string | null,
  ): Promise<ClienteDocumento> {
    const mimeType = file.type || "application/octet-stream";
    const nomeArquivo =
      file instanceof File && file.name ? file.name : "documento";

    const ext = assertMime(mimeType, nomeArquivo);
    const size = file.size;
    if (size <= 0) throw new Error("Arquivo vazio.");
    if (size > CLIENTE_DOC_MAX_BYTES) throw new Error("Arquivo excede 10 MB.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const objectId = randomUUID();
    const storagePath = `${this.tenantId}/clientes/${meta.clienteId}/${objectId}.${ext}`;

    const { error: uploadError } = await this.supabase.storage
      .from(CLIENTE_DOCUMENTOS_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      throw new Error(`Falha no upload: ${uploadError.message}`);
    }

    const { data, error } = await this.supabase
      .from("cliente_documentos" as never)
      .insert({
        tenant_id: this.tenantId,
        cliente_id: meta.clienteId,
        categoria: meta.categoria,
        nome_arquivo: nomeArquivo,
        descricao: meta.descricao ?? null,
        legenda: meta.legenda ?? nomeArquivo,
        storage_path: storagePath,
        mime_type: mimeType,
        tamanho_bytes: size,
        sha256,
        referencia_tipo: meta.referencia_tipo ?? null,
        referencia_id: meta.referencia_id ?? null,
        uploaded_by: userId,
      } as never)
      .select("*")
      .single();

    if (error) {
      await this.supabase.storage.from(CLIENTE_DOCUMENTOS_BUCKET).remove([storagePath]);
      throw new Error(error.message);
    }

    return data as ClienteDocumento;
  }

  async softDelete(documentoId: string): Promise<void> {
    const { error } = await this.supabase
      .from("cliente_documentos" as never)
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", documentoId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async createSignedUrl(documentoId: string, expiresIn = 120) {
    const { data: doc, error: fetchError } = await this.supabase
      .from("cliente_documentos" as never)
      .select("storage_path")
      .eq("id", documentoId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!doc) throw new Error("Documento não encontrado.");

    const storagePath = (doc as { storage_path: string }).storage_path;
    const storageClient = isAdminClientAvailable()
      ? createAdminClient()
      : this.supabase;

    const { data, error } = await storageClient.storage
      .from(CLIENTE_DOCUMENTOS_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Não foi possível gerar URL assinada.");
    }

    return { signedUrl: data.signedUrl, expiresIn };
  }
}

export async function createClienteDocumentoStorageService(tenantId: string) {
  const supabase = await createClient();
  return new ClienteDocumentoStorageService(supabase, tenantId);
}
