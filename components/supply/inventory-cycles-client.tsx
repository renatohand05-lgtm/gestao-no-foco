"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupplyInventoryCycleAction } from "@/lib/supply/supply-enterprise-actions";

type Row = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
};

type Props = {
  tenantSlug: string;
  ready: boolean;
  initialRows: Row[];
};

export function InventoryCyclesClient({
  tenantSlug,
  ready,
  initialRows,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;

  async function create(kind: "geral" | "rotativo") {
    setError(null);
    try {
      await createSupplyInventoryCycleAction(tenantSlug, kind);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar inventário");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => void create("geral")}
        >
          Novo inventário geral
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => void create("rotativo")}
        >
          Novo inventário rotativo
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        {initialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ciclo.</p>
        ) : (
          initialRows.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b py-2 text-sm"
            >
              <div>
                <div className="font-medium">{c.kind}</div>
                <div className="text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <Badge variant="outline">{c.status}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
