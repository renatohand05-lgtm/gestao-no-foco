"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFooterLink } from "@/components/auth/auth-footer-link";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { PasswordField } from "@/components/auth/password-field";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { getAuthRedirectPath } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
        },
      });

      if (signUpError) {
        console.error(signUpError);
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setSuccess(
          "Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.",
        );
        setLoading(false);
        return;
      }

      const destination = await getAuthRedirectPath();
      router.push(destination);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Crie sua conta"
      description={`Comece gratuitamente no ${siteConfig.name}`}
      footer={
        <AuthFooterLink
          text="Já tem conta?"
          linkText="Entrar"
          href="/login"
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <AuthAlert>{error}</AuthAlert> : null}
        {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

        <AuthField id="fullName" label="Nome completo">
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Seu nome"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </AuthField>

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

        <AuthField
          id="password"
          label="Senha"
          hint="Mínimo de 6 caracteres"
        >
          <PasswordField
            id="password"
            autoComplete="new-password"
            placeholder="Crie uma senha segura"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </AuthField>

        <AuthSubmitButton loading={loading} loadingText="Criando conta...">
          Criar conta grátis
        </AuthSubmitButton>
      </form>
    </AuthFormShell>
  );
}
