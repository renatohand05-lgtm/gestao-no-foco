"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFooterLink } from "@/components/auth/auth-footer-link";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { PasswordField } from "@/components/auth/password-field";
import { createClient } from "@/lib/supabase/client";

type UiState = "loading" | "ready" | "success" | "invalid" | "error";

function humanizePasswordError(message: string): string {
  if (/same password|should be different/i.test(message)) {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  if (/weak|password/i.test(message) && /character|length|short/i.test(message)) {
    return "A senha não atende à política mínima (mínimo de 8 caracteres).";
  }
  if (/session|expired|invalid|jwt/i.test(message)) {
    return "Link inválido ou expirado. Solicite uma nova recuperação de senha.";
  }
  return "Não foi possível atualizar a senha. Tente novamente.";
}

/**
 * Define nova senha após callback de recovery (sessão gerenciada pelo Supabase SSR).
 * Não lê/loga access_token nem grava token em localStorage.
 */
export function NewPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<UiState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ensureRecoverySession() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          setState("invalid");
          setError("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
          return;
        }
        setState("ready");
      } catch {
        if (!cancelled) {
          setState("invalid");
          setError("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
        }
      }
    }

    void ensureRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setState("error");
        setError(humanizePasswordError(updateError.message));
        return;
      }

      await supabase.auth.signOut();
      setState("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setState("error");
      setError(humanizePasswordError(message));
    } finally {
      setLoading(false);
    }
  }

  if (state === "loading") {
    return (
      <AuthFormShell title="Nova senha" description="Preparando redefinição…">
        <p className="text-sm text-muted-foreground">Validando link de recuperação…</p>
      </AuthFormShell>
    );
  }

  if (state === "success") {
    return (
      <AuthFormShell
        title="Senha atualizada"
        description="Sua senha foi redefinida com sucesso."
        footer={<AuthFooterLink text="Pronto?" linkText="Ir para o login" href="/login" />}
      >
        <AuthAlert id="reset-success" variant="success">
          Agora você pode entrar com a nova senha.
        </AuthAlert>
        <button
          type="button"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--brand-gold)] px-4 text-sm font-medium text-[var(--brand-ink)] transition hover:opacity-90"
          onClick={() => router.replace("/login")}
        >
          Ir para o login
        </button>
      </AuthFormShell>
    );
  }

  if (state === "invalid") {
    return (
      <AuthFormShell
        title="Link inválido"
        description="Não foi possível validar o link de recuperação."
        footer={
          <AuthFooterLink
            text="Precisa de um link novo?"
            linkText="Recuperar acesso"
            href="/recuperar"
          />
        }
      >
        <AuthAlert id="reset-invalid">{error}</AuthAlert>
        <Link
          href="/recuperar"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted"
        >
          Solicitar novo link
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Nova senha"
      description="Defina uma senha segura para sua conta (mínimo de 8 caracteres)."
      footer={<AuthFooterLink text="Voltar" linkText="Login" href="/login" />}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? <AuthAlert id="reset-error">{error}</AuthAlert> : null}

        <AuthField id="password" label="Nova senha">
          <PasswordField
            id="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            disabled={loading}
            aria-invalid={Boolean(error)}
            className="h-11"
          />
        </AuthField>

        <AuthField id="confirmPassword" label="Confirmar senha">
          <PasswordField
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            disabled={loading}
            aria-invalid={Boolean(error)}
            className="h-11"
          />
        </AuthField>

        <AuthSubmitButton loading={loading} loadingText="Salvando…">
          Salvar nova senha
        </AuthSubmitButton>
      </form>
    </AuthFormShell>
  );
}
