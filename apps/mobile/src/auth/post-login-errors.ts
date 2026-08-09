/**
 * Códigos sanitizados de falha pós-login / bootstrap autenticado.
 * Exibidos ao usuário sem tokens ou PII.
 */
export type PostLoginErrorCode =
  | "AUTH_POST_LOGIN_FAILED"
  | "MEMBERSHIP_LOAD_FAILED"
  | "TENANT_LOAD_FAILED"
  | "MOBILE_API_UNREACHABLE"
  | "API_BASE_IS_SUPABASE"
  | "API_BASE_MISSING"
  | "DASHBOARD_LOAD_FAILED"
  | "SESSION_REFRESH_FAILED"
  | "BRANCH_LOAD_FAILED"
  | "RBAC_DENIED";

export function messageForPostLoginCode(code: PostLoginErrorCode): string {
  switch (code) {
    case "AUTH_POST_LOGIN_FAILED":
      return "Não foi possível concluir o login. Tente novamente.";
    case "MEMBERSHIP_LOAD_FAILED":
    case "TENANT_LOAD_FAILED":
      return "Não foi possível carregar suas empresas.";
    case "MOBILE_API_UNREACHABLE":
      return "Não foi possível alcançar a API do aplicativo.";
    case "API_BASE_IS_SUPABASE":
      return "A URL da API do app estava apontando para o Supabase. Use a URL do site (Vercel).";
    case "API_BASE_MISSING":
      return "URL da API do app não configurada. Usando o endereço oficial.";
    case "DASHBOARD_LOAD_FAILED":
      return "Não foi possível carregar o dashboard.";
    case "SESSION_REFRESH_FAILED":
      return "Não foi possível renovar a sessão.";
    case "BRANCH_LOAD_FAILED":
      return "Não foi possível carregar as filiais.";
    case "RBAC_DENIED":
      return "Sem permissão para este recurso.";
    default:
      return "Não foi possível carregar seus dados.";
  }
}

export function classifyMembershipError(
  error: unknown,
  apiBaseCode?: string,
): PostLoginErrorCode {
  if (apiBaseCode === "API_BASE_IS_SUPABASE") return "API_BASE_IS_SUPABASE";
  if (apiBaseCode === "API_BASE_MISSING") return "API_BASE_MISSING";

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = message.toLowerCase();

  if (
    lower.includes("falha de rede") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("tempo esgotado") ||
    lower.includes("unreachable")
  ) {
    return "MOBILE_API_UNREACHABLE";
  }

  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("jwt")) {
    return "SESSION_REFRESH_FAILED";
  }

  return "MEMBERSHIP_LOAD_FAILED";
}
