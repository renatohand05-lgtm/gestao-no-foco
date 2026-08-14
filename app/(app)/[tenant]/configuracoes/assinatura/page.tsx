import { redirect } from "next/navigation";

import { BillingActionsPanel } from "@/components/billing/billing-actions-panel";
import { BillingCatalogPanel } from "@/components/billing/billing-catalog-panel";
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
import { isBillingEnforcementEnabled, isRealChargesAuthorized } from "@/lib/billing/config";
import { getBillingOperationalStatus } from "@/lib/billing/operational-status";
import type { PaymentHint } from "@/lib/billing/payment-hint";
import { resolveBillingDateLabels } from "@/lib/billing/payment-hint";
import { resolveCommercialLifecycle } from "@/lib/billing/status-guard";
import { enrichPaymentHintFromProvider } from "@/lib/billing/enrich-payment-hint";
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
      if (view.subscription?.providerSubscriptionId && initialPaymentHint) {
        initialPaymentHint = await enrichPaymentHintFromProvider({
          providerSubscriptionId: view.subscription.providerSubscriptionId,
          hint: initialPaymentHint,
          tenantId: auth.tenant.id,
        });
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
  const commercialLifecycle = resolveCommercialLifecycle({
    subscriptionStatus: sub?.status ?? null,
    checkoutCompleted: Boolean(initialPaymentHint),
  });
  const ops = getBillingOperationalStatus();
  /** Piloto/beta: cobrança real OFF e enforcement OFF — não expor checkout sandbox ao cliente. */
  const pilotBillingFrozen =
    !isBillingEnforcementEnabled() && !isRealChargesAuthorized();

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

      {pilotBillingFrozen ? (
        <FeedbackMessage variant="info">
          Piloto sem cobrança real. Pagamentos online não estão ativos. O uso do
          produto não depende de checkout neste momento — suporte define o plano
          comercial manualmente.
        </FeedbackMessage>
      ) : auth.isSandbox ? (
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

      {!pilotBillingFrozen && !auth.providerConfigured ? (
        <FeedbackMessage variant="info">
          Cobrança online ainda não configurada no servidor. Trial sem cartão
          permanece disponível quando habilitado.
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
            <p className="text-xs font-medium text-muted-foreground">
              Seu plano atual
            </p>
            <p>
              <span className="text-muted-foreground">Plano:</span>{" "}
              {plan?.name ?? (pilotBillingFrozen ? "Piloto (manual)" : "Nenhum")}
              {plan?.isPilot ? " (piloto interno)" : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="capitalize">
                {sub?.status ?? (pilotBillingFrozen ? "piloto" : "—")}
              </span>
              {commercialLifecycle === "pending" ? (
                <span className="text-muted-foreground">
                  {" "}
                  · Aguardando confirmação do pagamento
                </span>
              ) : null}
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
            {!pilotBillingFrozen ? (
              <p>
                <span className="text-muted-foreground">Provedor:</span>{" "}
                {sub?.provider ?? auth.provider}
                {auth.providerConfigured ? "" : " (não configurado)"}
              </p>
            ) : null}
            {!pilotBillingFrozen && sub?.providerCustomerId ? (
              <p>
                <span className="text-muted-foreground">Customer:</span>{" "}
                <code className="text-xs">{sub.providerCustomerId}</code>
              </p>
            ) : null}
            {!pilotBillingFrozen && sub?.providerSubscriptionId ? (
              <p>
                <span className="text-muted-foreground">Subscription:</span>{" "}
                <code className="text-xs">{sub.providerSubscriptionId}</code>
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Cobrança real:</span>{" "}
              {isRealChargesAuthorized() ? "autorizada" : "desligada (piloto)"}
            </p>
            {!pilotBillingFrozen && auth.canManage ? (
              <p className="text-[11px] text-muted-foreground">
                Operacional: env={ops.environment}
                {" · "}checkout={ops.checkoutEnabled ? "on" : "off"}
                {" · "}cobrança real={ops.realChargesEnabled ? "on" : "off"}
                {" · "}key production=
                {ops.productionApiKeyPresent ? "presente" : "ausente"}
                {ops.productionApiKeyBlockedExternally
                  ? " (bloqueio externo Asaas)"
                  : ""}
              </p>
            ) : null}
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
              {pilotBillingFrozen
                ? "Checkout online não faz parte do piloto atual."
                : "Checkout server-side. Status active só via webhook confiável."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pilotBillingFrozen ? (
              <p className="text-sm text-muted-foreground">
                Não há pagamento PIX, boleto ou cartão neste piloto. Dúvidas de
                plano: fale com o suporte responsável — não use telas de
                sandbox como cobrança real.
              </p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planos disponíveis</CardTitle>
          <CardDescription>
            {pilotBillingFrozen
              ? "Referência comercial. Nenhuma cobrança é iniciada nesta tela no piloto."
              : "Catálogo comercial mensal (BRL). Checkout production e cobrança real permanecem desligados."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pilotBillingFrozen ? (
            <BillingCatalogPanel
              tenantSlug={tenantSlug}
              canManage={false}
              currentPlanSlug={plan?.slug ?? null}
            />
          ) : (
            <BillingCatalogPanel
              tenantSlug={tenantSlug}
              canManage={auth.canManage}
              currentPlanSlug={plan?.slug ?? null}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
