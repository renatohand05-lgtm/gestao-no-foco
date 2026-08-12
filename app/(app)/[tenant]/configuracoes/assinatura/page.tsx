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

export const metadata = { title: "Assinatura" };

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
  try {
    view = await loadBillingView(auth.tenant.id);
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

      {schemaMissing ? (
        <FeedbackMessage variant="warning">
          Schema de billing ainda não aplicado neste ambiente. Peça ao operador
          para aplicar{" "}
          <code className="text-xs">
            supabase/migrations/20260823_phase33_3_billing.sql
          </code>{" "}
          (manual). Enquanto isso, o piloto opera sem cobrança.
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
            {sub?.currentPeriodEnd ? (
              <p>
                <span className="text-muted-foreground">Próxima renovação:</span>{" "}
                {sub.currentPeriodEnd.slice(0, 10)}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Provedor:</span>{" "}
              {sub?.provider ?? auth.provider}
              {auth.providerConfigured ? "" : " (não configurado)"}
            </p>
            <p>
              <span className="text-muted-foreground">Enforcement:</span>{" "}
              {isBillingEnforcementEnabled() ? "ligado" : "desligado (piloto)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciar</CardTitle>
            <CardDescription>
              Checkout real exige provedor + autorização. Frontend nunca marca
              pagamento como aprovado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingActionsPanel
              tenantSlug={tenantSlug}
              canManage={auth.canManage}
              hasSubscription={Boolean(sub)}
              providerConfigured={auth.providerConfigured}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
