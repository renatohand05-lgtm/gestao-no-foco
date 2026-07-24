"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFooterLink } from "@/components/auth/auth-footer-link";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { PasswordField } from "@/components/auth/password-field";
import { Input } from "@/components/ui/input";
import { brandConfig } from "@/config/brand";
import { getPostLoginPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

function humanizeLoginError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "E-mail ou senha incorretos. Verifique e tente novamente.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (/failed to fetch/i.test(message)) {
    return "Falha de comunicação com o servidor. Verifique a conexão e tente de novo.";
  }
  return message;
}

/**
 * Login premium — hierarquia, a11y e Brand (Gate 19.4).
 * Autenticação inalterada.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (signInError) {
        console.error(signInError);
        setError(humanizeLoginError(signInError.message));
        return;
      }

      if (!data.user) {
        setError("Sessão não criada após o login. Tente novamente.");
        return;
      }

      const destination = await getPostLoginPath(
        supabase,
        data.user.id,
        redirectTo,
      );

      router.push(destination);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(humanizeLoginError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Entrar"
      description={`${brandConfig.slogan} — acesse sua conta ${brandConfig.name}.`}
      footer={
        <AuthFooterLink
          text="Não tem conta?"
          linkText="Cadastre-se"
          href="/register"
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? (
          <AuthAlert id="login-error">{error}</AuthAlert>
        ) : null}

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
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            disabled={loading}
            className="h-11"
          />
        </AuthField>

        <AuthField id="password" label="Senha">
          <PasswordField
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            className="h-11"
          />
        </AuthField>

        <AuthSubmitButton loading={loading} loadingText="Entrando…">
          Entrar no {brandConfig.name}
        </AuthSubmitButton>
      </form>
    </AuthFormShell>
  );
}
