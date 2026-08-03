"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import {
  patchClienteTarefaAction,
  updateClienteTarefaStatusAction,
} from "@/lib/crm/actions";
import type { FollowUpItem } from "@/lib/crm/phase28/follow-up-queue";
import type { PremiumFollowUpBucket } from "@/lib/crm/premium/types";
import { cn } from "@/lib/utils";

const BUCKETS: Array<{
  key: PremiumFollowUpBucket;
  title: string;
  tone: string;
}> = [
  { key: "atrasados", title: "Atrasados", tone: "danger" },
  { key: "hoje", title: "Hoje", tone: "warning" },
  { key: "amanha", title: "Amanhã", tone: "info" },
  { key: "esta_semana", title: "Esta semana", tone: "info" },
  { key: "sem_responsavel", title: "Sem responsável", tone: "neutral" },
  { key: "sem_data", title: "Sem data", tone: "neutral" },
];

type Props = {
  tenantSlug: string;
  groups: Record<PremiumFollowUpBucket, FollowUpItem[]>;
  members: Array<{ id: string; nome: string }>;
  warning?: string | null;
};

function shiftIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FollowUpPremiumPanel({
  tenantSlug,
  groups,
  members,
  warning,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await action();
      if (!res.success) {
        setError(res.error ?? "Falha na ação.");
        return;
      }
      setMessage(ok);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-crm-premium="follow-up">
      {warning ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{warning}</p>
      ) : null}
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {message ? <FeedbackMessage variant="success">{message}</FeedbackMessage> : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {BUCKETS.map((b) => {
          const items = groups[b.key] ?? [];
          return (
            <Card key={b.key} data-tone={b.tone}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {b.title}{" "}
                  <span className="text-muted-foreground">({items.length})</span>
                </CardTitle>
                <CardDescription>Ações rápidas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item.</p>
                ) : (
                  items.slice(0, 14).map((item) => (
                    <div
                      key={`${item.origem}-${item.id}`}
                      className="space-y-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/30"
                    >
                      <div>
                        <div className="font-medium">{item.titulo}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.tipo} · {item.dataRef || "sem data"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <Link
                          href={`/${tenantSlug}/clientes/${item.clienteId}`}
                          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {item.clienteNome}
                        </Link>
                        <Link
                          href={`/${tenantSlug}/crm/oportunidades`}
                          className="text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Oportunidades
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            "rounded border px-2 py-1 text-xs hover:bg-muted",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                          onClick={() =>
                            run(
                              () =>
                                updateClienteTarefaStatusAction(
                                  tenantSlug,
                                  item.id,
                                  "concluida",
                                  item.clienteId,
                                ),
                              "Follow-up concluído.",
                            )
                          }
                        >
                          Concluir
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded border px-2 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            run(
                              () =>
                                patchClienteTarefaAction(tenantSlug, item.id, {
                                  data_vencimento: shiftIso(1),
                                  clienteId: item.clienteId,
                                }),
                              "Adiado para amanhã.",
                            )
                          }
                        >
                          Adiar +1d
                        </button>
                        {members.length ? (
                          <label className="inline-flex items-center gap-1 text-xs">
                            <span className="sr-only">Atribuir</span>
                            <select
                              className="h-7 max-w-[9rem] rounded border bg-background px-1"
                              disabled={pending}
                              defaultValue=""
                              aria-label={`Atribuir ${item.titulo}`}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (!v) return;
                                run(
                                  () =>
                                    patchClienteTarefaAction(tenantSlug, item.id, {
                                      responsavel_id: v,
                                      clienteId: item.clienteId,
                                    }),
                                  "Responsável atualizado.",
                                );
                              }}
                            >
                              <option value="">Atribuir…</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nome}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
