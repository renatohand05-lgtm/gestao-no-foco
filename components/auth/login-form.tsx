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
import { siteConfig } from "@/config/site";
import { getPostLoginPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

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
        setError(signInError.message);
        return;
      }

      if (!data.user) {
        setError("Sessão não criada após o login.");
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
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Bem-vindo de volta"
      description={`Entre na sua conta do ${siteConfig.name}`}
      footer={
        <AuthFooterLink
          text="Não tem conta?"
          linkText="Cadastre-se grátis"
          href="/register"
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <AuthField id="email" label="E-mail">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </AuthField>

        <AuthField id="password" label="Senha">
          <PasswordField
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </AuthField>

        <AuthSubmitButton loading={loading} loadingText="Entrando...">
          Entrar
        </AuthSubmitButton>
      </form>
    </AuthFormShell>
  );
}
