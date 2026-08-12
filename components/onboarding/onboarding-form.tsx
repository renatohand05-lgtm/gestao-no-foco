"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import {
  createTenantWithOwner,
  getTenantSlugConflictMessage,
  slugifyTenantName,
} from "@/lib/onboarding/create-tenant";
import { createClient } from "@/lib/supabase/client";
import { buildLastTenantCookie } from "@/lib/tenant/active-tenant";
import type { TenantSegment } from "@/types";

const segments: { value: TenantSegment; label: string }[] = [
  { value: "oficina", label: "Oficina mecânica" },
  { value: "restaurante", label: "Restaurante" },
  { value: "comercio", label: "Comércio" },
  { value: "consultoria", label: "Consultoria" },
  { value: "servicos", label: "Prestador de serviços" },
  { value: "outro", label: "Outro" },
];

type OnboardingFormProps = {
  mode?: "first" | "additional";
};

export function OnboardingForm({ mode = "first" }: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<TenantSegment>("comercio");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const slug = slugifyTenantName(name);
  const isAdditional = mode === "additional";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || submitted) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (!slug) {
        setError("Informe um nome válido para a empresa.");
        return;
      }

      const result = await createTenantWithOwner(supabase, {
        name,
        slug,
        segment,
        userId: user.id,
      });

      if (!result.success) {
        console.error(result.error);
        setError(
          result.error.code === "23505"
            ? getTenantSlugConflictMessage()
            : result.error.message,
        );
        return;
      }

      setSubmitted(true);
      document.cookie = buildLastTenantCookie(result.slug);
      router.push(`/${result.slug}/primeiro-acesso`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title={isAdditional ? "Nova empresa" : "Configure sua empresa"}
      description={
        isAdditional
          ? "Crie outra empresa na mesma conta. Você será OWNER desta empresa."
          : "Crie a empresa e avance ao onboarding enterprise multissetorial."
      }
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <AuthField id="name" label="Nome da empresa">
          <Input
            id="name"
            placeholder="Ex: Oficina Silva"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={loading || submitted}
          />
        </AuthField>

        {slug ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Seu painel ficará em{" "}
            <span className="font-medium text-foreground">
              /{slug}/primeiro-acesso
            </span>
          </p>
        ) : null}

        <AuthField id="segment" label="Segmento">
          <select
            id="segment"
            value={segment}
            onChange={(event) =>
              setSegment(event.target.value as TenantSegment)
            }
            disabled={loading || submitted}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {segments.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </AuthField>

        <AuthSubmitButton
          loading={loading || submitted}
          loadingText="Criando empresa..."
        >
          {isAdditional
            ? "Criar empresa"
            : "Continuar para o primeiro acesso"}
        </AuthSubmitButton>
      </form>
    </AuthFormShell>
  );
}
