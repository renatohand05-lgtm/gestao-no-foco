"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/lib/equipe/accept-actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        aria-label="Aceitar convite e entrar"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptInvitationAction(token);
            if (!result.ok) {
              setError(result.error.message);
              return;
            }
            router.replace(`/${result.data.tenantSlug}/dashboard`);
          });
        }}
      >
        {pending ? "Aceitando…" : "Aceitar convite e entrar"}
      </Button>
    </div>
  );
}
