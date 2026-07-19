/**
 * Mapeia erros técnicos (PostgREST / Postgres) para mensagens úteis ao usuário.
 * Mantém log técnico no servidor — nunca transforma falha estrutural em sucesso.
 */

import { logger } from "@/lib/observability/logger";

export function mapDatabaseErrorToUserMessage(
  error: unknown,
  fallback = "Não foi possível concluir a operação. Tente novamente.",
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  const message = raw.toLowerCase();

  if (
    (message.includes("could not find") && message.includes("column")) ||
    (message.includes("column") && message.includes("schema cache"))
  ) {
    return "O cadastro está temporariamente desatualizado no servidor (coluna ausente). Peça ao administrador para aplicar as migrations pendentes e recarregar o schema.";
  }

  if (message.includes("column") && message.includes("does not exist")) {
    return "Estrutura do banco incompleta para esta operação. Verifique se as migrations recentes foram aplicadas no Supabase.";
  }

  if (message.includes("relation") && message.includes("does not exist")) {
    return "Tabela necessária não encontrada no banco. Verifique as migrations pendentes.";
  }

  if (message.includes("duplicate key") || message.includes("23505")) {
    return "Já existe um registro com os mesmos dados únicos neste tenant.";
  }

  if (message.includes("row-level security") || message.includes("42501")) {
    return "Você não tem permissão para esta operação neste tenant.";
  }

  if (message.includes("jwt") || message.includes("not authenticated")) {
    return "Sessão expirada. Faça login novamente.";
  }

  // Mantém mensagem de negócio já amigável (duplicidade, validação etc.)
  if (
    raw.includes("Possível duplicidade") ||
    raw.includes("não pode") ||
    raw.includes("Informe") ||
    raw.includes("Estorne")
  ) {
    return raw;
  }

  // Evita vazar JSON bruto / stacks
  if (raw.trim().startsWith("{") || raw.includes("\n    at ")) {
    return fallback;
  }

  return raw.length > 220 ? fallback : raw;
}

export function logServerDatabaseError(context: string, error: unknown): void {
  logger.exception(`db:${context}`, error, { scope: "database" });
}

/** Padroniza retorno de server actions com log técnico + mensagem segura. */
export function toActionError(
  error: unknown,
  fallback: string,
  context = "action",
): { success: false; error: string } {
  logServerDatabaseError(context, error);
  return {
    success: false,
    error: mapDatabaseErrorToUserMessage(error, fallback),
  };
}
