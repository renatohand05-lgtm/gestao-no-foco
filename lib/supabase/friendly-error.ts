/**
 * Mapeia erros técnicos (PostgREST / Postgres / rede) para mensagens úteis ao usuário.
 * Mantém log técnico no servidor — nunca transforma falha estrutural em sucesso.
 */

import { logger } from "../observability/logger.ts";

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
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("fetch failed")
  ) {
    return "Falha de comunicação com o servidor. Verifique a conexão e tente novamente.";
  }

  if (message.includes("pgrst116") || message.includes("results contain 0 rows")) {
    return "Registro não encontrado ou sem permissão para visualizar.";
  }

  if (message.includes("timeout") || message.includes("aborted")) {
    return "A operação demorou demais. Tente novamente em instantes.";
  }

  if (
    (message.includes("could not find") && message.includes("column")) ||
    (message.includes("column") && message.includes("schema cache"))
  ) {
    return "O cadastro está temporariamente desatualizado no servidor. Peça ao administrador para aplicar as atualizações pendentes.";
  }

  if (message.includes("column") && message.includes("does not exist")) {
    return "Estrutura do banco incompleta para esta operação. Verifique se as atualizações recentes foram aplicadas.";
  }

  if (message.includes("relation") && message.includes("does not exist")) {
    return "Recurso necessário não encontrado no banco. Verifique atualizações pendentes.";
  }

  if (message.includes("duplicate key") || message.includes("23505")) {
    return "Já existe um registro com os mesmos dados nesta empresa.";
  }

  if (
    message.includes("row-level security") ||
    message.includes("42501") ||
    message.includes("permission denied")
  ) {
    return "Você não tem permissão para esta operação nesta empresa.";
  }

  if (message.includes("jwt") || message.includes("not authenticated")) {
    return "Sessão expirada. Faça login novamente.";
  }

  if (message.includes("500") && message.includes("internal")) {
    return fallback;
  }

  if (
    message.includes("23503") ||
    message.includes("foreign key") ||
    message.includes("ordens_servico_mecanico_id_fkey") ||
    message.includes("ordem_servico_itens_mecanico_id_fkey")
  ) {
    return "Não foi possível vincular o mecânico selecionado. Atualize a seleção e tente novamente.";
  }

  if (
    message.includes("unrecognized format()") ||
    message.includes("format() type specifier")
  ) {
    return "Não foi possível vincular o mecânico a esta OS. Tente novamente.";
  }

  if (
    raw.includes("Possível duplicidade") ||
    raw.includes("não pode") ||
    raw.includes("não está disponível nesta empresa") ||
    raw.includes("Informe") ||
    raw.includes("Estorne")
  ) {
    return raw;
  }

  if (
    raw.trim().startsWith("{") ||
    raw.includes("\n    at ") ||
    /^PGRST\d+/i.test(raw.trim())
  ) {
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
