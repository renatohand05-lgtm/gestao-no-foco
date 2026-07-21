"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { SectionCard } from "@/components/ui/section-card";
import { updateClienteTarefaStatusAction } from "@/lib/crm/actions";
import {
  CRM_TAREFA_STATUS,
  CRM_TAREFA_TIPO_LABELS,
} from "@/lib/crm/constants";
import { formatClienteDate } from "@/lib/clientes/format";
import type { ClienteTarefa } from "@/types/crm";

type CrmTarefasListProps = {
  tenantSlug: string;
  tarefas: ClienteTarefa[];
  showClienteLink?: boolean;
  clientesMap?: Record<string, string>;
};

export function CrmTarefasList({
  tenantSlug,
  tarefas,
  showClienteLink = false,
  clientesMap = {},
}: CrmTarefasListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(id: string, status: string, clienteId: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateClienteTarefaStatusAction(
        tenantSlug,
        id,
        status,
        clienteId,
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!tarefas.length) {
    return (
      <SectionCard title="Tarefas">
        <p className="text-sm text-muted-foreground">Nenhuma tarefa aberta.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Tarefas">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      <ul className="divide-y">
        {tarefas.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{t.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {CRM_TAREFA_TIPO_LABELS[t.tipo]} · {t.status}
                {t.data_vencimento
                  ? ` · vence ${formatClienteDate(t.data_vencimento)}`
                  : ""}
              </p>
              {showClienteLink ? (
                <Link
                  href={`/${tenantSlug}/clientes/${t.cliente_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {clientesMap[t.cliente_id] ?? "Ver cliente"}
                </Link>
              ) : null}
            </div>
            {t.status !== "concluida" && t.status !== "cancelada" ? (
              <select
                className="rounded border border-input bg-transparent px-2 py-1 text-xs"
                disabled={pending}
                value={t.status}
                onChange={(e) => handleStatus(t.id, e.target.value, t.cliente_id)}
              >
                {CRM_TAREFA_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
