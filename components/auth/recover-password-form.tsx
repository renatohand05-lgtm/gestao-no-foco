"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFooterLink } from "@/components/auth/auth-footer-link";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { absoluteAppUrl } from "@/lib/config/app-url";
import { createClient } from "@/lib/supabase/client";

const NEUTRAL_SENT_MESSAGE =
  "Se existir uma conta com este e-mail, enviaremos as instruções para redefinir a senha.";

function humanizeRecoverError(message: string): string {
  if (/rate limit|over_email_send_rate_limit|too many requests|429/i.test(message)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }
  if (/failed to fetch|network/i.test(message)) {
    return "Falha de comunicação com o servidor. Verifique a conexão e tente de novo.";
  }
  return "Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes.";
}

/**
 * Solicita reset via Supabase Auth.
 * Mensagem de sucesso é neutra (não enumera se o e-mail existe).
 */
export function RecoverPasswordForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError === "invalid_or_expired"
      ? "Link inválido ou expirado. Solicite uma nova recuperação de senha."
      : null,
  );
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = absoluteAppUrl("/api/auth/callback?next=/nova-senha");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );

      if (resetError) {
        setError(humanizeRecoverError(resetError.message));
        return;
      }

      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(humanizeRecoverError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Recuperar acesso"
      description="Informe o e-mail da sua conta para receber o link de redefinição."
      footer={
        <AuthFooterLink text="Lembrou a senha?" linkText="Voltar ao login" href="/login" />
      }
    >
      {sent ? (
        <div className="space-y-5">
          <AuthAlert id="recover-success" variant="success">
            {NEUTRAL_SENT_MESSAGE}
          </AuthAlert>
          <p className="text-sm text-muted-foreground">
            Verifique também a pasta de spam. O link expira conforme a política do provedor
            de autenticação.
          </p>
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--brand-gold)] px-4 text-sm font-medium text-[var(--brand-ink)] transition hover:opacity-90"
          >
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error ? <AuthAlert id="recover-error">{error}</AuthAlert> : null}

          <AuthField id="email" label="E-mail">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              inputMode="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "recover-error" : undefined}
              className="h-11"
            />
          </AuthField>

          <AuthSubmitButton loading={loading} loadingText="Enviando…">
            Enviar instruções
          </AuthSubmitButton>
        </form>
      )}
    </AuthFormShell>
  );
}
