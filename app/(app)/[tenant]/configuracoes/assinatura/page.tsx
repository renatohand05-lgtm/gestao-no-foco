import { redirect } from "next/navigation";

import { BillingActionsPanel } from "@/components/billing/billing-actions-panel";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import {
  BILLING_ERROR_CODES,
  BillingError,
  loadBillingView,
  requireBillingPageAuth,
} from "@/lib/billing/auth";
import { isBillingEnforcementEnabled } from "@/lib/billing/config";
import type { PaymentHint } from "@/lib/billing/payment-hint";
import { resolveBillingDateLabels } from "@/lib/billing/payment-hint";
import { getLatestCheckoutForTenant } from "@/lib/billing/repository";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Assinatura" };

function parsePaymentHint(summary: unknown): PaymentHint | null {
  if (!summary || typeof summary !== "object") return null;
  const hint = (summary as { paymentHint?: PaymentHint }).paymentHint;
  if (!hint || typeof hint !== "object") return null;
  if (!hint.billingType) return null;
  return hint;
}

export default async function AssinaturaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireBillingPageAuth(tenantSlug);
  } catch (err) {
    if (err instanceof BillingError) {
      if (err.code === BILLING_ERROR_CODES.SESSION_MISSING) {
        redirect("/login");
      }
      return (
        <div className="space-y-6">
          <ModuleHeader
            title="Assinatura"
            description="Plano e status comercial desta empresa"
            breadcrumbs={[
              { label: "Configurações", href: `/${tenantSlug}/configuracoes` },
              { label: "Assinatura" },
            ]}
          />
          <FeedbackMessage variant="error">{err.message}</FeedbackMessage>
        </div>
      );
    }
    throw err;
  }

  let view;
  let schemaMissing = false;
  let initialPaymentHint: PaymentHint | null = null;
  try {
    view = await loadBillingView(auth.tenant.id);
    try {
      const supabase = await createClient();
      const latest = await getLatestCheckoutForTenant(supabase, auth.tenant.id);
      if (latest?.status === "completed") {
        initialPaymentHint = parsePaymentHint(latest.result_summary);
      }
    } catch {
      /* checkout history opcional */
    }
  } catch (err) {
    if (
      err instanceof BillingError &&
      err.code === BILLING_ERROR_CODES.SCHEMA_MISSING
    ) {
      schemaMissing = true;
      view = {
        subscription: null,
        plan: null,
        trialExpired: false,
        accessMode: "open" as const,
        restrictionReason: null,
      };
    } else {
      throw err;
    }
  }

  const sub = view.subscription;
  const plan = view.plan;
  const dateLabels = resolveBillingDateLabels({
    currentChargeDue: initialPaymentHint?.dueDate,
    nextRenewal: sub?.currentPeriodEnd,
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Assinatura"
        description="Plano e status comercial desta empresa (tenant)"
        breadcrumbs={[
          { label: "Configurações", href: `/${tenantSlug}/configuracoes` },
          { label: "Assinatura" },
        ]}
      />

      {auth.isSandbox ? (
        <FeedbackMessage variant="warning">
          AMBIENTE DE TESTE / SANDBOX — cobranças Asaas, se ativadas, não são
          production.
        </FeedbackMessage>
      ) : null}

      {schemaMissing ? (
        <FeedbackMessage variant="warning">
          Schema de billing ainda não aplicado neste ambiente.
        </FeedbackMessage>
      ) : null}

      {!auth.providerConfigured ? (
        <FeedbackMessage variant="info">
          Asaas ainda não configurado no servidor. Configure:{" "}
          {auth.missingCredentials.join(", ") ||
            "BILLING_PROVIDER, ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN"}
          . Trial sem cartão permanece disponível.
        </FeedbackMessage>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plano atual</CardTitle>
            <CardDescription>
              Assinatura vinculada à empresa{" "}
              <span className="font-medium text-foreground">
                {auth.tenant.name}
              </span>
              — não ao usuário.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Plano:</span>{" "}
              {plan?.name ?? "Nenhum"}
              {plan?.isPilot ? " (piloto interno)" : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="capitalize">{sub?.status ?? "—"}</span>
            </p>
            {sub?.status === "trial" ? (
              <p>
                <span className="text-muted-foreground">Trial até:</span>{" "}
                {sub.trialEnd?.slice(0, 10) ?? "—"}
                {view.trialExpired ? " (expirado)" : ""}
              </p>
            ) : null}
            {dateLabels.currentChargeDue ? (
              <p>
                <span className="text-muted-foreground">
                  Cobrança atual / vencimento:
                </span>{" "}
                {dateLabels.currentChargeDue}
              </p>
            ) : null}
            {dateLabels.nextRenewal ? (
              <p>
                <span className="text-muted-foreground">
                  Próxima renovação:
                </span>{" "}
                {dateLabels.nextRenewal}
              </p>
            ) : null}
            {dateLabels.sameDate ? (
              <p className="text-[11px] text-muted-foreground">
                A data acima é o vencimento da cobrança atual; a próxima
                renovação do ciclo ainda não diverge no provedor.
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Provedor:</span>{" "}
              {sub?.provider ?? auth.provider}
              {auth.providerConfigured ? "" : " (não configurado)"}
            </p>
            {sub?.providerCustomerId ? (
              <p>
                <span className="text-muted-foreground">Customer:</span>{" "}
                <code className="text-xs">{sub.providerCustomerId}</code>
              </p>
            ) : null}
            {sub?.providerSubscriptionId ? (
              <p>
                <span className="text-muted-foreground">Subscription:</span>{" "}
                <code className="text-xs">{sub.providerSubscriptionId}</code>
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Enforcement:</span>{" "}
              {isBillingEnforcementEnabled() ? "ligado" : "desligado (piloto)"}
            </p>
            <p className="text-xs text-muted-foreground">
              past_due / canceled: não apagam tenant nem histórico. Grace period
              comercial ainda não definido — suporte técnico preparado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciar</CardTitle>
            <CardDescription>
              Checkout server-side. Status active só via webhook confiável.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingActionsPanel
              key={
                initialPaymentHint
                  ? [
                      initialPaymentHint.billingType,
                      initialPaymentHint.dueDate ?? "",
                      initialPaymentHint.providerStatus ?? "",
                      initialPaymentHint.invoiceUrl ?? "",
                      initialPaymentHint.bankSlipUrl ?? "",
                      initialPaymentHint.pixCopiaECola ?? "",
                    ].join("|")
                  : "no-hint"
              }
              tenantSlug={tenantSlug}
              canManage={auth.canManage}
              hasSubscription={Boolean(sub)}
              providerConfigured={auth.providerConfigured}
              subscriptionStatus={sub?.status ?? null}
              isSandbox={auth.isSandbox}
              initialPaymentHint={initialPaymentHint}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
