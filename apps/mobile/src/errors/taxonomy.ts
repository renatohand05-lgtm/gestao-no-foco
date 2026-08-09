/**
 * Sprint 32.2 — Taxonomia de erros mobile (UX).
 * Mensagens claras por categoria — nunca um genérico único para todos os casos.
 */
import type { ApiErrorCode } from "@gof/api-contracts";

export type MobileErrorCategory =
  | "NETWORK_ERROR"
  | "AUTH_ERROR"
  | "SESSION_EXPIRED"
  | "PERMISSION_DENIED"
  | "TENANT_ERROR"
  | "API_ERROR"
  | "DATA_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

const USER_MESSAGES: Record<MobileErrorCategory, string> = {
  NETWORK_ERROR:
    "Não foi possível conectar. Verifique sua internet e tente novamente.",
  AUTH_ERROR: "Não foi possível autenticar. Verifique seus dados e tente novamente.",
  SESSION_EXPIRED: "Sua sessão expirou. Entre novamente.",
  PERMISSION_DENIED: "Seu perfil não possui acesso a esta funcionalidade.",
  TENANT_ERROR: "Não foi possível carregar os dados da empresa. Tente novamente.",
  API_ERROR: "Não foi possível carregar os dados agora.",
  DATA_UNAVAILABLE:
    "Parte dos dados está indisponível no momento. Os valores ausentes não são zero.",
  VALIDATION_ERROR: "Alguns dados estão incompletos ou inválidos.",
  UNKNOWN_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
};

export function messageForMobileError(category: MobileErrorCategory): string {
  return USER_MESSAGES[category];
}

export function categoryFromApiError(
  code: ApiErrorCode | string | undefined,
  status?: number,
): MobileErrorCategory {
  if (code === "NETWORK_ERROR" || code === "TIMEOUT") return "NETWORK_ERROR";
  if (code === "UNAUTHORIZED" || status === 401) return "SESSION_EXPIRED";
  if (code === "FORBIDDEN" || status === 403) return "PERMISSION_DENIED";
  if (code === "VALIDATION_ERROR" || status === 400 || status === 422) {
    return "VALIDATION_ERROR";
  }
  if (code === "NOT_FOUND" || status === 404) return "DATA_UNAVAILABLE";
  if (code === "SERVER_ERROR" || (status != null && status >= 500)) {
    return "API_ERROR";
  }
  return "UNKNOWN_ERROR";
}

export function userMessageFromApiFailure(input: {
  code?: ApiErrorCode | string;
  status?: number;
}): string {
  return messageForMobileError(categoryFromApiError(input.code, input.status));
}
