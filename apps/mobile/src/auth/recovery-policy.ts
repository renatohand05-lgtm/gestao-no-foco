import type { AuthErrorCode } from "@gof/domain";

/**
 * Classificação de falhas de bootstrap / desbloqueio.
 * Impede mapear biometria ou token inválido como "sem conexão".
 * Mensagens espelham `errors.ts` (sem import de alias — testável no Node).
 */
export type AuthFailureKind =
  | "network"
  | "session_expired"
  | "biometric_cancelled"
  | "biometric_unavailable"
  | "biometric_failed"
  | "local_credential_invalid"
  | "unexpected";

const MESSAGES: Record<AuthFailureKind, string> = {
  network: "Sem conexão. Verifique a internet.",
  session_expired: "Sessão expirada. Faça login novamente.",
  biometric_cancelled: "Desbloqueio cancelado.",
  biometric_unavailable: "Biometria não configurada neste dispositivo.",
  biometric_failed: "Não foi possível validar a biometria.",
  local_credential_invalid: "Credencial local inválida. Faça login novamente.",
  unexpected: "Ocorreu um erro. Tente novamente.",
};

export function messageForAuthFailure(kind: AuthFailureKind): string {
  return MESSAGES[kind] ?? MESSAGES.unexpected;
}

export function authCodeForFailure(kind: AuthFailureKind): AuthErrorCode {
  switch (kind) {
    case "network":
      return "network_unavailable";
    case "session_expired":
      return "session_expired";
    case "biometric_cancelled":
      return "biometric_cancelled";
    case "biometric_unavailable":
      return "biometric_not_enrolled";
    case "biometric_failed":
      return "biometric_failed";
    case "local_credential_invalid":
      return "refresh_failed";
    default:
      return "unknown";
  }
}

/** Resultado do unlock biométrico → kind sem confundir com rede. */
export function classifyBiometricUnlockFailure(
  message: string,
): AuthFailureKind {
  const lower = message.toLowerCase();
  if (lower.includes("cancel")) return "biometric_cancelled";
  if (lower.includes("não configurada") || lower.includes("nao configurada")) {
    return "biometric_unavailable";
  }
  if (lower.includes("biometr")) return "biometric_failed";
  return "biometric_failed";
}

/**
 * Refresh online falhou → credencial/sessão local inválida (não rede).
 * Offline explícito → rede.
 */
export function classifyRestoreFailure(input: {
  network: "online" | "offline" | "unknown";
  refreshOk: boolean;
  hasSessionAfterRefresh: boolean;
}): AuthFailureKind {
  if (input.network === "offline") return "network";
  if (!input.refreshOk || !input.hasSessionAfterRefresh) {
    return "local_credential_invalid";
  }
  return "unexpected";
}

/** API / fetch error → rede só quando o código/mensagem indicam rede. */
export function classifyApiLoadFailure(error: unknown): AuthFailureKind {
  if (!error) return "unexpected";
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
    lower.includes("tempo esgotado") ||
    lower.includes("timeout") ||
    lower.includes("sem conexão") ||
    lower.includes("sem conexao")
  ) {
    return "network";
  }

  if (
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("jwt") ||
    lower.includes("sessão") ||
    lower.includes("sessao") ||
    lower.includes("refresh")
  ) {
    return "session_expired";
  }

  return "unexpected";
}

export function titleForAuthFailure(kind: AuthFailureKind): string {
  switch (kind) {
    case "network":
      return "Sem conexão";
    case "session_expired":
    case "local_credential_invalid":
      return "Sessão inválida";
    case "biometric_cancelled":
      return "Desbloqueio cancelado";
    case "biometric_unavailable":
      return "Biometria indisponível";
    case "biometric_failed":
      return "Falha na biometria";
    default:
      return "Não foi possível continuar";
  }
}

export function toNormalizedFromKind(kind: AuthFailureKind): {
  code: AuthErrorCode;
  message: string;
} {
  return {
    code: authCodeForFailure(kind),
    message: messageForAuthFailure(kind),
  };
}
