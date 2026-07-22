"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import {
  reabrirAlertaAction,
  syncAlertasAction,
  tratarAlertaAction,
} from "@/lib/operacoes/alertas-actions";
import type { OperacaoAlerta } from "@/lib/operacoes/alertas-service";
import { cn } from "@/lib/utils";

const sevClass: Record<string, string> = {
  critico: "border-rose-500/50 bg-rose-50/40 dark:bg-rose-950/20",
  alto: "border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20",
  medio: "border-sky-500/40",
  informativo: "border-border",
};

type Props = {
  tenantSlug: string;
  alertas: OperacaoAlerta[];
};

export function AlertasManager({ tenantSlug, alertas }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [obs, setObs] = useState<Record<string, string>>({});

  function sync() {
    startTransition(async () => {
      const r = await syncAlertasAction(tenantSlug);
      if (!r.success) setError(r.error ?? "Falha no sync");
      else router.refresh();
    });
  }

  function tratar(id: string) {
    startTransition(async () => {
      const r = await tratarAlertaAction(tenantSlug, id, {
        observacao: obs[id] || null,
      });
      if (!r.success) setError(r.error ?? "Falha");
      else router.refresh();
    });
  }

  function reabrir(id: string) {
    startTransition(async () => {
      const r = await reabrirAlertaAction(tenantSlug, id, obs[id] || null);
      if (!r.success) setError(r.error ?? "Falha");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ size: "sm" }))}
          onClick={sync}
        >
          Sincronizar alertas
        </button>
        <span className="text-xs text-muted-foreground self-center">
          {alertas.filter((a) => a.persistido).length} persistidos ·{" "}
          {alertas.filter((a) => !a.tratado).length} abertos
        </span>
      </div>

      {alertas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum alerta. Clique em sincronizar para varrer a operação.
        </p>
      ) : (
        <ul className="space-y-2">
          {alertas.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-lg border p-3 space-y-2",
                sevClass[a.severidade] ?? sevClass.informativo,
                a.tratado && "opacity-70",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {a.severidade} · {a.tipo.replaceAll("_", " ")}
                    {a.persistido ? "" : " · temporário"}
                    {a.tratado ? " · tratado" : ""}
                  </p>
                  <p className="font-medium">{a.titulo}</p>
                  {a.descricao ? (
                    <p className="text-sm text-muted-foreground">{a.descricao}</p>
                  ) : null}
                  {a.tratadoEm ? (
                    <p className="text-[11px] text-muted-foreground">
                      Tratado em{" "}
                      {new Date(a.tratadoEm).toLocaleString("pt-BR")}
                    </p>
                  ) : null}
                </div>
                {a.href ? (
                  <Link href={a.href} className="text-sm underline shrink-0">
                    Abrir origem
                  </Link>
                ) : null}
              </div>
              {a.persistido ? (
                <div className="flex flex-wrap gap-2 items-end">
                  <input
                    className="h-9 flex-1 min-w-[160px] rounded-md border border-input bg-transparent px-2 text-sm"
                    placeholder="Observação"
                    value={obs[a.id] ?? ""}
                    onChange={(e) =>
                      setObs((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                  />
                  {!a.tratado ? (
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ size: "sm" }))}
                      onClick={() => tratar(a.id)}
                    >
                      Marcar tratado
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                      onClick={() => reabrir(a.id)}
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
