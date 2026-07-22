"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { decidirDescontoAction } from "@/lib/descontos/desconto-aprovacao-actions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Evento = Database["public"]["Tables"]["desconto_eventos"]["Row"];

type Props = {
  tenantSlug: string;
  eventos: Evento[];
  canApprove: boolean;
};

export function DescontoAprovacaoQueue({
  tenantSlug,
  eventos,
  canApprove,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  if (eventos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma solicitação pendente.
      </p>
    );
  }

  function decidir(id: string, decisao: "aprovar" | "rejeitar") {
    setError(null);
    startTransition(async () => {
      const result = await decidirDescontoAction(
        tenantSlug,
        id,
        decisao,
        motivos[id],
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {eventos.map((e) => (
        <div key={e.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {e.entidade_tipo.toUpperCase()} ·{" "}
                {formatCurrency(Number(e.valor_desconto))} ({e.percentual}%)
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString("pt-BR")} · alçada{" "}
                {e.cargo_autorizador ?? "—"} · tipo {e.tipo_desconto ?? "—"}
                {e.solicitante_id ? (
                  <>
                    {" "}
                    · solicitante {e.solicitante_id.slice(0, 8)}…
                  </>
                ) : null}
                {e.autorizador_id ? (
                  <>
                    {" "}
                    · responsável {e.autorizador_id.slice(0, 8)}…
                  </>
                ) : null}
              </p>
            </div>
            <Link
              href={
                e.entidade_tipo === "os"
                  ? `/${tenantSlug}/ordens/${e.entidade_id}`
                  : `/${tenantSlug}/vendas/${e.entidade_id}`
              }
              className="text-sm underline"
            >
              Ver operação
            </Link>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>
              Original: <strong>{formatCurrency(Number(e.valor_original))}</strong>
            </p>
            <p>
              Final: <strong>{formatCurrency(Number(e.valor_final))}</strong>
            </p>
            <p>
              Margem antes:{" "}
              <strong>
                {e.margem_antes != null
                  ? formatCurrency(Number(e.margem_antes))
                  : "—"}
              </strong>
            </p>
            <p>
              Margem depois:{" "}
              <strong>
                {e.margem_depois != null
                  ? formatCurrency(Number(e.margem_depois))
                  : "—"}
              </strong>
            </p>
          </div>

          <p className="text-sm">
            Motivo: <span className="text-muted-foreground">{e.motivo}</span>
          </p>

          {canApprove ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="block flex-1 space-y-1 text-sm">
                <span className="text-muted-foreground">
                  Observação da decisão
                </span>
                <Input
                  value={motivos[e.id] ?? ""}
                  onChange={(ev) =>
                    setMotivos((m) => ({ ...m, [e.id]: ev.target.value }))
                  }
                  disabled={pending}
                />
              </label>
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants({ size: "sm" }))}
                onClick={() => decidir(e.id, "aprovar")}
              >
                Aprovar
              </button>
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() => decidir(e.id, "rejeitar")}
              >
                Rejeitar
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
