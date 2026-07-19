"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import { uploadNfeXmlAction } from "@/lib/nfe/actions";
import { useOptionalToast } from "@/components/platform/toast-provider";
import { cn } from "@/lib/utils";

export function NfeUploadForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const toast = useOptionalToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await uploadNfeXmlAction(tenantSlug, fd);
          if (!result.success) {
            setError(result.error);
            toast?.error(result.error);
            return;
          }
          if (result.duplicated) {
            toast?.warning(
              "Esta NF-e já foi importada. Abrindo a nota existente.",
              "Nota duplicada",
            );
          } else {
            toast?.success("XML lido. Continue a conferência.");
          }
          router.push(
            `/${tenantSlug}/estoque/notas-fiscais/${result.notaId}/conferencia`,
          );
        });
      }}
    >
      {error ? <FeedbackMessage>{error}</FeedbackMessage> : null}
      <label className="block space-y-2 text-sm">
        <span className="text-muted-foreground">Arquivo XML da NF-e (máx. 2MB)</span>
        <input
          type="file"
          name="xml"
          accept=".xml,application/xml,text/xml"
          required
          disabled={pending}
          className="block w-full text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants())}
      >
        {pending ? "Lendo XML…" : "Enviar e conferir"}
      </button>
    </form>
  );
}
