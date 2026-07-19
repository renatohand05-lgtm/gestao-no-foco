import "server-only";

import { createHash } from "node:crypto";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { checkInspecaoRateLimit } from "@/lib/ordens/inspecao-rate-limit";
import type { Database } from "@/types/database";

const APP_IP_SALT = "gestao-no-foco-inspecao-v1";

export type InspecaoPublicaPayload = {
  ok: boolean;
  error?: string;
  oficina?: { nome: string; logo_url: string | null };
  os?: Record<string, unknown>;
  cliente?: { nome: string };
  veiculo?: Record<string, unknown>;
  compartilhamento?: Record<string, unknown>;
  orcamento?: Record<string, unknown> | null;
  checklist?: unknown[];
  diagnosticos?: unknown[];
  itens?: unknown[];
  anexos?: unknown[];
};

export type AprovacaoPublicaInput = {
  modo: "total" | "parcial" | "reprovar" | "contato";
  nome?: string | null;
  observacao?: string | null;
  aceiteAviso: boolean;
  itens?: Array<{ id: string; decisao: "aprovado" | "reprovado" }>;
  ip?: string | null;
  userAgent?: string | null;
};

export type AprovacaoPublicaResult = {
  ok: boolean;
  error?: string;
  aprovacao_id?: string;
  status_versao?: string;
  status_os?: string;
  aprovados?: number;
  reprovados?: number;
  modo?: string;
};

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase anon não configurado.");
  }

  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hashIp(ip: string): string {
  const salt = process.env.INSPECAO_IP_SALT ?? APP_IP_SALT;
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

function assertRateLimit(ip: string | null | undefined, token: string) {
  const key = `${ip ?? "unknown"}:${token.slice(0, 16)}`;
  const result = checkInspecaoRateLimit(key);
  if (!result.allowed) {
    const seconds = Math.ceil((result.retryAfterMs ?? 60_000) / 1000);
    throw new Error(
      `Muitas tentativas. Aguarde ${seconds}s antes de tentar novamente.`,
    );
  }
}

export class AprovacaoPublicaService {
  async loadByToken(
    token: string,
    ip?: string | null,
  ): Promise<InspecaoPublicaPayload> {
    assertRateLimit(ip, token);

    const supabase = createAnonClient();

    const [resumo, detalhes] = await Promise.all([
      supabase.rpc("inspecao_publica_por_token" as never, {
        p_token: token,
      } as never),
      supabase.rpc("inspecao_publica_detalhes" as never, {
        p_token: token,
      } as never),
    ]);

    if (resumo.error) throw new Error(resumo.error.message);
    if (detalhes.error) throw new Error(detalhes.error.message);

    const base = (resumo.data ?? {}) as InspecaoPublicaPayload;
    const extra = (detalhes.data ?? {}) as InspecaoPublicaPayload;

    if (!base.ok) {
      return base;
    }

    if (!extra.ok) {
      return extra;
    }

    return {
      ...base,
      checklist: extra.checklist ?? [],
      diagnosticos: extra.diagnosticos ?? [],
      itens: extra.itens ?? [],
      anexos: extra.anexos ?? [],
    };
  }

  async approveByToken(
    token: string,
    payload: AprovacaoPublicaInput,
  ): Promise<AprovacaoPublicaResult> {
    assertRateLimit(payload.ip, token);

    const supabase = createAnonClient();
    const ipHash = payload.ip ? hashIp(payload.ip) : null;

    const itensJson =
      payload.modo === "parcial" && payload.itens?.length
        ? payload.itens.map((item) => ({
            id: item.id,
            decisao: item.decisao,
          }))
        : null;

    const { data, error } = await supabase.rpc(
      "inspecao_publica_aprovar" as never,
      {
        p_token: token,
        p_modo: payload.modo,
        p_nome: payload.nome ?? null,
        p_observacao: payload.observacao ?? null,
        p_aceite_aviso: payload.aceiteAviso,
        p_itens: itensJson,
        p_ip_hash: ipHash,
        p_user_agent: payload.userAgent ?? null,
      } as never,
    );

    if (error) throw new Error(error.message);
    return (data ?? { ok: false, error: "resposta_vazia" }) as AprovacaoPublicaResult;
  }
}

export const aprovacaoPublicaService = new AprovacaoPublicaService();
