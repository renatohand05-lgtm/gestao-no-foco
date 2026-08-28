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
import { REFERRAL_CODE_COOKIE } from "@/lib/platform/referral-cookie";
import { listProductOnboardingSegments } from "@/config/onboarding/segments";
import type { TenantSegment } from "@/types";

const segments: { value: TenantSegment; label: string }[] =
  listProductOnboardingSegments().map((s) => ({
    value: s.id as TenantSegment,
    label: s.label,
  }));

type OnboardingFormProps = {
  mode?: "first" | "additional";
};

export function OnboardingForm({ mode = "first" }: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<TenantSegment>("oficina");
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

      // Se veio de um link de indicação (?ref=código no cadastro), resolve o
      // código pro ID do parceiro. Falha em resolver não bloqueia a criação
      // da empresa — só não marca a indicação.
      let referredByPartnerId: string | null = null;
      const refMatch = document.cookie.match(
        new RegExp(`(?:^|; )${REFERRAL_CODE_COOKIE}=([^;]*)`),
      );
      const refCode = refMatch ? decodeURIComponent(refMatch[1]) : null;
      if (refCode) {
        const { data: partnerId } = await supabase.rpc(
          "platform_resolve_referral_code" as never,
          { p_code: refCode } as never,
        );
        referredByPartnerId = (partnerId as string | null) ?? null;
      }

      const result = await createTenantWithOwner(supabase, {
        name,
        slug,
        segment,
        userId: user.id,
        referredByPartnerId,
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

      // Indicação já foi aplicada (ou não havia) — limpa o cookie pra não
      // vazar pra uma segunda empresa criada depois pela mesma conta.
      document.cookie = `${REFERRAL_CODE_COOKIE}=; path=/; max-age=0`;

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

        <AuthField id="segment" label="Qual é o seu tipo de negócio?">
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
