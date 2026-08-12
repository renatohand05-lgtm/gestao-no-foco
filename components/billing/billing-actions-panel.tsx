"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  requestCheckoutAction,
  startPilotTrialAction,
} from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";

type Props = {
  tenantSlug: string;
  canManage: boolean;
  hasSubscription: boolean;
  providerConfigured: boolean;
};

export function BillingActionsPanel({
  tenantSlug,
  canManage,
  hasSubscription,
  providerConfigured,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `chk-${Date.now()}`;
    startTransition(async () => {
      const res = await requestCheckoutAction({
        tenantSlug,
        idempotencyKey,
      });
      if (res.ok) {
        setMessage(res.message);
      } else {
        setError(res.message);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {!hasSubscription ? (
        <Button disabled={pending} onClick={onStartTrial}>
          {pending ? "Ativando…" : "Ativar trial piloto (sem cartão)"}
        </Button>
      ) : null}

      <Button
        variant="outline"
        disabled={pending}
        onClick={onCheckout}
      >
        {providerConfigured
          ? "Solicitar checkout (servidor)"
          : "Checkout (provedor não configurado)"}
      </Button>

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
