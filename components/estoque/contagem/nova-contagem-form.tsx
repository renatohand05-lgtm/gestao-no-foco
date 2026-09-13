"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ClipboardList, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { createContagemAction } from "@/lib/estoque/estoque-contagem-actions";
import { CONTAGEM_PERIODICIDADE_OPTIONS } from "@/types/estoque-contagem";
import type { ContagemPeriodicidade } from "@/types/estoque-contagem";

const selectClassName =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function NovaContagemForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [periodicidade, setPeriodicidade] =
    useState<ContagemPeriodicidade>("semanal");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createContagemAction(tenantSlug, periodicidade);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/${tenantSlug}/estoque/contagem/${result.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={periodicidade}
        onChange={(e) =>
          setPeriodicidade(e.target.value as ContagemPeriodicidade)
        }
        className={selectClassName}
        aria-label="Periodicidade da contagem"
        disabled={pending}
      >
        {CONTAGEM_PERIODICIDADE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button onClick={handleCreate} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ClipboardList className="size-4" aria-hidden />
        )}
        Nova contagem
      </Button>
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
    </div>
  );
}
