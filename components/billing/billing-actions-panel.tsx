"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelSubscriptionAction,
  requestCheckoutAction,
  startPilotTrialAction,
} from "@/lib/billing/actions";
import type { PaymentHint } from "@/lib/billing/payment-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BillingMethod = "PIX" | "BOLETO" | "CREDIT_CARD";

type Props = {
  tenantSlug: string;
  canManage: boolean;
  hasSubscription: boolean;
  providerConfigured: boolean;
  subscriptionStatus: string | null;
  isSandbox: boolean;
  initialPaymentHint?: PaymentHint | null;
};

export function BillingActionsPanel({
  tenantSlug,
  canManage,
  hasSubscription,
  providerConfigured,
  subscriptionStatus,
  isSandbox,
  initialPaymentHint = null,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [billingType, setBillingType] = useState<BillingMethod>("PIX");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [paymentHint, setPaymentHint] = useState<PaymentHint | null>(
    initialPaymentHint,
  );

  // Cartão: somente em memória React — sem persistência no browser.
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardMonth, setCardMonth] = useState("");
  const [cardYear, setCardYear] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [cardPostal, setCardPostal] = useState("");
  const [cardAddressNumber, setCardAddressNumber] = useState("");
  const [cardPhone, setCardPhone] = useState("");
  const [cardHolderDoc, setCardHolderDoc] = useState("");

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Somente o proprietário (OWNER) pode gerenciar a assinatura desta
        empresa.
      </p>
    );
  }

  function clearCardFields() {
    setCardHolderName("");
    setCardNumber("");
    setCardMonth("");
    setCardYear("");
    setCardCcv("");
    setCardPostal("");
    setCardAddressNumber("");
    setCardPhone("");
    setCardHolderDoc("");
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
        card:
          billingType === "CREDIT_CARD"
            ? {
                holderName: cardHolderName,
                number: cardNumber,
                expiryMonth: cardMonth,
                expiryYear: cardYear,
                ccv: cardCcv,
                holderInfoName: cardHolderName,
                holderEmail: email,
                holderCpfCnpj: cardHolderDoc || document,
                postalCode: cardPostal,
                addressNumber: cardAddressNumber,
                phone: cardPhone,
              }
            : undefined,
      });
      if (res.ok) {
        setMessage(res.message);
        if (res.paymentHint) setPaymentHint(res.paymentHint);
        if (billingType === "CREDIT_CARD") clearCardFields();
      } else {
        setError(res.message);
        if (billingType === "CREDIT_CARD") clearCardFields();
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

  const methodLabel =
    paymentHint?.billingType === "CREDIT_CARD"
      ? "CARTÃO"
      : paymentHint?.billingType ?? "—";

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
          Checkout Asaas (PIX / Boleto / Cartão)
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
            autoComplete="email"
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
            autoComplete="off"
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
          <Button
            type="button"
            size="sm"
            variant={billingType === "CREDIT_CARD" ? "default" : "outline"}
            disabled={pending}
            onClick={() => setBillingType("CREDIT_CARD")}
          >
            Cartão
          </Button>
        </div>

        {billingType === "CREDIT_CARD" ? (
          <div className="space-y-2 rounded-md border border-dashed border-border/80 p-2">
            <p className="text-[11px] text-muted-foreground">
              Cartão enviado só via HTTPS para tokenização Asaas. PAN/CVV não
              são gravados.
            </p>
            <label className="block text-xs text-muted-foreground">
              Nome no cartão
              <Input
                className="mt-1"
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                disabled={pending}
                autoComplete="cc-name"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Número
              <Input
                className="mt-1"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                disabled={pending}
                inputMode="numeric"
                autoComplete="cc-number"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs text-muted-foreground">
                Mês
                <Input
                  className="mt-1"
                  value={cardMonth}
                  onChange={(e) => setCardMonth(e.target.value)}
                  placeholder="MM"
                  disabled={pending}
                  autoComplete="cc-exp-month"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Ano
                <Input
                  className="mt-1"
                  value={cardYear}
                  onChange={(e) => setCardYear(e.target.value)}
                  placeholder="AAAA"
                  disabled={pending}
                  autoComplete="cc-exp-year"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                CVV
                <Input
                  className="mt-1"
                  value={cardCcv}
                  onChange={(e) => setCardCcv(e.target.value)}
                  disabled={pending}
                  autoComplete="cc-csc"
                />
              </label>
            </div>
            <label className="block text-xs text-muted-foreground">
              CPF/CNPJ do titular
              <Input
                className="mt-1"
                value={cardHolderDoc}
                onChange={(e) => setCardHolderDoc(e.target.value)}
                disabled={pending}
                autoComplete="off"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              CEP
              <Input
                className="mt-1"
                value={cardPostal}
                onChange={(e) => setCardPostal(e.target.value)}
                disabled={pending}
                autoComplete="postal-code"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Nº endereço
              <Input
                className="mt-1"
                value={cardAddressNumber}
                onChange={(e) => setCardAddressNumber(e.target.value)}
                disabled={pending}
                autoComplete="off"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Telefone
              <Input
                className="mt-1"
                value={cardPhone}
                onChange={(e) => setCardPhone(e.target.value)}
                disabled={pending}
                autoComplete="tel"
              />
            </label>
          </div>
        ) : null}

        <Button variant="outline" disabled={pending} onClick={onCheckout}>
          {providerConfigured
            ? `Iniciar checkout ${billingType === "CREDIT_CARD" ? "CARTÃO" : billingType}`
            : "Checkout (Asaas não configurado)"}
        </Button>
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
        <div
          className="rounded-md bg-muted px-3 py-2 text-xs space-y-1"
          data-billing-method={paymentHint.billingType}
        >
          <p>
            Método: {methodLabel} · Valor: {paymentHint.value ?? "—"} · Venc.:{" "}
            {paymentHint.dueDate ?? "—"}
          </p>
          {paymentHint.divergence ? (
            <p className="text-destructive" role="alert">
              Divergência com o provedor (
              {paymentHint.providerBillingType ?? "—"}). Método exibido é o
              solicitado.
            </p>
          ) : null}
          {paymentHint.billingType === "PIX" && paymentHint.pixQrCodeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="QR Code PIX"
              className="mt-1 h-40 w-40 rounded border border-border bg-white"
              src={`data:image/png;base64,${paymentHint.pixQrCodeImage}`}
            />
          ) : null}
          {paymentHint.billingType === "PIX" && paymentHint.pixCopiaECola ? (
            <p className="break-all font-mono text-[10px]">
              PIX copia e cola: {paymentHint.pixCopiaECola}
            </p>
          ) : null}
          {paymentHint.invoiceUrl ? (
            <a
              className="text-primary underline"
              href={paymentHint.invoiceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {paymentHint.billingType === "PIX"
                ? "Abrir fatura / pagamento PIX"
                : paymentHint.billingType === "BOLETO"
                  ? "Abrir fatura"
                  : "Abrir fatura / pagamento"}
            </a>
          ) : null}
          {paymentHint.billingType === "BOLETO" && paymentHint.bankSlipUrl ? (
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
