"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelSubscriptionAction,
  requestCheckoutAction,
  startPilotTrialAction,
} from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  tenantSlug: string;
  canManage: boolean;
  hasSubscription: boolean;
  providerConfigured: boolean;
  subscriptionStatus: string | null;
  isSandbox: boolean;
};

export function BillingActionsPanel({
  tenantSlug,
  canManage,
  hasSubscription,
  providerConfigured,
  subscriptionStatus,
  isSandbox,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO">("PIX");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [paymentHint, setPaymentHint] = useState<{
    invoiceUrl?: string | null;
    bankSlipUrl?: string | null;
    dueDate?: string | null;
    value?: number | null;
    billingType?: string;
  } | null>(null);

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Somente o proprietário (OWNER) pode gerenciar a assinatura desta
        empresa.
      </p>
    );
  }

  function onStartTrial() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await startPilotTrialAction(tenantSlug);
      if (res.ok) {
        setMessage(res.message);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  function onCheckout() {
    setMessage(null);
    setError(null);
    setPaymentHint(null);
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `chk-${Date.now()}`;
    startTransition(async () => {
      const res = await requestCheckoutAction({
        tenantSlug,
        idempotencyKey,
        billingType,
        customerEmail: email || undefined,
        customerDocument: document || undefined,
      });
      if (res.ok) {
        setMessage(res.message);
        if (res.paymentHint) setPaymentHint(res.paymentHint);
      } else {
        setError(res.message);
      }
      router.refresh();
    });
  }

  function onCancel() {
    if (
      !window.confirm(
        "Cancelar a assinatura desta empresa? Os dados operacionais não serão apagados.",
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await cancelSubscriptionAction(tenantSlug);
      if (res.ok) {
        setMessage(res.message);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      {isSandbox ? (
        <p
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
          role="status"
        >
          AMBIENTE DE TESTE / SANDBOX — nenhuma cobrança real.
        </p>
      ) : null}

      {!hasSubscription ? (
        <Button disabled={pending} onClick={onStartTrial}>
          {pending ? "Ativando…" : "Ativar trial piloto (sem cartão)"}
        </Button>
      ) : null}

      <div className="space-y-2 rounded-md border border-border/70 p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Checkout Asaas (PIX / Boleto)
        </p>
        <label className="block text-xs text-muted-foreground">
          E-mail de cobrança
          <Input
            className="mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="financeiro@empresa.com"
            disabled={pending}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          CPF/CNPJ da empresa
          <Input
            className="mt-1"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="Somente números"
            disabled={pending}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={billingType === "PIX" ? "default" : "outline"}
            disabled={pending}
            onClick={() => setBillingType("PIX")}
          >
            PIX
          </Button>
          <Button
            type="button"
            size="sm"
            variant={billingType === "BOLETO" ? "default" : "outline"}
            disabled={pending}
            onClick={() => setBillingType("BOLETO")}
          >
            Boleto
          </Button>
        </div>
        <Button
          variant="outline"
          disabled={pending}
          onClick={onCheckout}
        >
          {providerConfigured
            ? `Iniciar checkout ${billingType}`
            : "Checkout (Asaas não configurado)"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Cartão: não disponível sem tokenização Asaas (sem formulário inseguro).
        </p>
      </div>

      {hasSubscription && subscriptionStatus !== "canceled" ? (
        <Button
          variant="destructive"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar assinatura
        </Button>
      ) : null}

      {paymentHint ? (
        <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1">
          <p>
            Método: {paymentHint.billingType ?? "—"} · Valor:{" "}
            {paymentHint.value ?? "—"} · Venc.: {paymentHint.dueDate ?? "—"}
          </p>
          {paymentHint.invoiceUrl ? (
            <a
              className="text-primary underline"
              href={paymentHint.invoiceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir fatura / pagamento
            </a>
          ) : null}
          {paymentHint.bankSlipUrl ? (
            <a
              className="block text-primary underline"
              href={paymentHint.bankSlipUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir boleto
            </a>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
