"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { limparBaseServicosAction } from "@/lib/produtos/service-bulk-actions";
import type { ServiceCleanupPreview } from "@/lib/produtos/service-bulk-service";

type Props = {
  tenantSlug: string;
  preview: ServiceCleanupPreview;
};

export function ServiceCleanupPreviewPanel({ tenantSlug, preview }: Props) {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <h2 className="text-base font-medium">Preview de limpeza</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-lg tabular-nums">{preview.total}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Excluíveis (sem uso)</dt>
          <dd className="text-lg tabular-nums">{preview.excluiveis}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Só arquiváveis (com uso)</dt>
          <dd className="text-lg tabular-nums">{preview.arquivaveis}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Custo zero</dt>
          <dd className="tabular-nums">{preview.custoZero}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Preço zero</dt>
          <dd className="tabular-nums">{preview.precoZero}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Duplicados</dt>
          <dd className="tabular-nums">{preview.duplicados}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Serviços usados em vendas/OS serão apenas desativados. Sem dependência:
        exclusão lógica (deleted_at). Produtos não são afetados. Histórico
        preservado.
      </p>
      <label className="block space-y-1 text-sm">
        <span>
          Digite <strong>LIMPAR SERVIÇOS</strong> para confirmar
        </span>
        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="LIMPAR SERVIÇOS"
          autoComplete="off"
        />
      </label>
      <Button
        type="button"
        variant="destructive"
        disabled={pending || confirmation !== "LIMPAR SERVIÇOS"}
        onClick={() => {
          startTransition(async () => {
            try {
              const result = await limparBaseServicosAction({
                tenantSlug,
                confirmation,
              });
              setMessage(
                `Concluído: ${result.softDeleted} excluídos logicamente, ${result.deactivated} desativados.`,
              );
              setConfirmation("");
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Falha na limpeza.");
            }
          });
        }}
      >
        Limpar base de serviços
      </Button>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
