import type { AuthErrorCode } from "@gof/domain";
import type { AuthError } from "@supabase/supabase-js";

export type NormalizedAuthError = {
  code: AuthErrorCode;
  message: string;
};

const FRIENDLY: Partial<Record<AuthErrorCode, string>> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  session_expired: "Sessão expirada. Faça login novamente.",
  session_revoked: "Sessão encerrada. Faça login novamente.",
  network_unavailable: "Sem conexão. Verifique a internet.",
  biometric_failed: "Não foi possível validar a biometria.",
  biometric_not_enrolled: "Biometria não configurada neste dispositivo.",
  biometric_cancelled: "Desbloqueio cancelado.",
  password_reset_failed: "Não foi possível enviar o e-mail de recuperação.",
  password_update_failed: "Não foi possível atualizar a senha.",
  tenant_membership_missing: "Você não possui acesso a nenhuma empresa.",
  refresh_failed: "Não foi possível renovar a sessão.",
  unknown: "Ocorreu um erro. Tente novamente.",
};

export function friendlyAuthMessage(code: AuthErrorCode): string {
  return FRIENDLY[code] ?? FRIENDLY.unknown!;
}

export function normalizeAuthError(error: unknown): NormalizedAuthError {
  if (error && typeof error === "object" && "code" in error) {
    const authError = error as AuthError;
    const status = authError.status;

    if (authError.message?.toLowerCase().includes("invalid login credentials")) {
      return { code: "invalid_credentials", message: friendlyAuthMessage("invalid_credentials") };
    }
    if (authError.message?.toLowerCase().includes("email not confirmed")) {
      return { code: "email_not_confirmed", message: friendlyAuthMessage("email_not_confirmed") };
    }
    if (status === 401 || authError.message?.toLowerCase().includes("jwt")) {
      return { code: "session_expired", message: friendlyAuthMessage("session_expired") };
    }
  }

  if (error instanceof TypeError || (error instanceof Error && error.message.includes("Network"))) {
    return { code: "network_unavailable", message: friendlyAuthMessage("network_unavailable") };
  }

  return { code: "unknown", message: friendlyAuthMessage("unknown") };
}

export function authErrorFromCode(code: AuthErrorCode, override?: string): NormalizedAuthError {
  return { code, message: override ?? friendlyAuthMessage(code) };
}
