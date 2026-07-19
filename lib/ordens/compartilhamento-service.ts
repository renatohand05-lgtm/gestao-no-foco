import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type CompartilhamentoCanal =
  | "link"
  | "email"
  | "whatsapp"
  | "pdf"
  | "outro";

export type CreateShareInput = {
  canal: CompartilhamentoCanal;
  destinatario?: string | null;
  validadeHoras?: number;
  versaoOrcamentoId?: string | null;
  mensagemTemplate?: string | null;
};

export type ShareCreatedResult = {
  id: string;
  token: string;
  urlPath: string;
  expiraEm: string;
};

export type ShareListItem = {
  id: string;
  ordem_servico_id: string;
  versao_orcamento_id: string | null;
  token_prefix: string;
  canal: string;
  destinatario: string | null;
  status: string;
  expira_em: string;
  revogado_em: string | null;
  visualizacoes: number;
  ultima_visualizacao_em: string | null;
  created_at: string;
};

const DEFAULT_VALIDADE_HORAS = 72;
const TOKEN_BYTES = 32;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}

function buildUrlPath(token: string): string {
  return `/inspecao/${token}`;
}

export class CompartilhamentoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  /**
   * Cria link público. O token em claro é retornado uma única vez;
   * apenas token_hash e token_prefix são persistidos.
   */
  async createShare(
    osId: string,
    input: CreateShareInput,
    userId: string | null,
  ): Promise<ShareCreatedResult> {
    const validadeHoras = input.validadeHoras ?? DEFAULT_VALIDADE_HORAS;
    if (validadeHoras <= 0) {
      throw new Error("Validade deve ser maior que zero.");
    }

    if (input.versaoOrcamentoId) {
      const { data: versao, error: versaoError } = await this.supabase
        .from("ordem_servico_orcamento_versoes" as never)
        .select("id")
        .eq("id", input.versaoOrcamentoId)
        .eq("tenant_id", this.tenantId)
        .eq("ordem_servico_id", osId)
        .is("deleted_at", null)
        .maybeSingle();

      if (versaoError) throw new Error(versaoError.message);
      if (!versao) {
        throw new Error("Versão de orçamento inválida para esta OS.");
      }
    }

    const token = randomBytes(TOKEN_BYTES).toString("hex");
    const expiraEm = new Date(
      Date.now() + validadeHoras * 3_600_000,
    ).toISOString();

    const { data, error } = await this.supabase
      .from("ordem_servico_compartilhamentos" as never)
      .insert({
        tenant_id: this.tenantId,
        ordem_servico_id: osId,
        versao_orcamento_id: input.versaoOrcamentoId ?? null,
        token_hash: hashToken(token),
        token_prefix: tokenPrefix(token),
        canal: input.canal,
        destinatario: input.destinatario ?? null,
        status: "ativo",
        expira_em: expiraEm,
        criado_por: userId,
        mensagem_template: input.mensagemTemplate ?? null,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await this.supabase.from("ordem_servico_eventos" as never).insert({
      tenant_id: this.tenantId,
      ordem_servico_id: osId,
      tipo: "compartilhamento",
      descricao: `Link de inspeção criado (${input.canal})`,
      entidade_tipo: "ordem_servico_compartilhamento",
      entidade_id: (data as { id: string }).id,
      user_id: userId,
    } as never);

    return {
      id: (data as { id: string }).id,
      token,
      urlPath: buildUrlPath(token),
      expiraEm,
    };
  }

  async revokeShare(shareId: string): Promise<void> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("ordem_servico_compartilhamentos" as never)
      .update({
        status: "revogado",
        revogado_em: now,
        updated_at: now,
      } as never)
      .eq("id", shareId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .select("ordem_servico_id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Compartilhamento não encontrado.");
  }

  async listShares(osId: string): Promise<ShareListItem[]> {
    const { data, error } = await this.supabase
      .from("ordem_servico_compartilhamentos" as never)
      .select(
        "id, ordem_servico_id, versao_orcamento_id, token_prefix, canal, destinatario, status, expira_em, revogado_em, visualizacoes, ultima_visualizacao_em, created_at",
      )
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", osId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ShareListItem[];
  }

  buildWhatsAppDeepLink(phone: string, message: string): string {
    const digits = phone.replace(/\D/g, "");
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${digits}?text=${encoded}`;
  }

  emailConfigured(): boolean {
    return Boolean(
      process.env.EMAIL_PROVIDER ||
        process.env.RESEND_API_KEY ||
        process.env.SMTP_HOST,
    );
  }
}

export async function createCompartilhamentoService(tenantId: string) {
  const supabase = await createClient();
  return new CompartilhamentoService(supabase, tenantId);
}

export { buildUrlPath as buildInspecaoUrlPath };
