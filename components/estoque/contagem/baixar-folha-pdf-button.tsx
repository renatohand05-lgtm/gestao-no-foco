"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getContagemPdfAction } from "@/lib/estoque/estoque-contagem-actions";

export function BaixarFolhaPdfButton({
  tenantSlug,
  contagemId,
}: {
  tenantSlug: string;
  contagemId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleBaixar() {
    setError(null);
    startTransition(async () => {
      const result = await getContagemPdfAction(tenantSlug, contagemId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <Button variant="outline" onClick={handleBaixar} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        Baixar folha de contagem (PDF)
      </Button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
