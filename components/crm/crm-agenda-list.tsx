"use client";

import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { CRM_AGENDA_TIPO_LABELS } from "@/lib/crm/constants";
import { formatClienteDate } from "@/lib/clientes/format";
import type { ClienteAgendamento } from "@/types/crm";

type CrmAgendaListProps = {
  tenantSlug: string;
  agendamentos: ClienteAgendamento[];
  clientesMap?: Record<string, string>;
};

export function CrmAgendaList({
  tenantSlug,
  agendamentos,
  clientesMap = {},
}: CrmAgendaListProps) {
  if (!agendamentos.length) {
    return (
      <SectionCard title="Agenda">
        <p className="text-sm text-muted-foreground">
          Nenhum compromisso agendado neste período.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Agenda">
      <ul className="divide-y">
        {agendamentos.map((ag) => (
          <li key={ag.id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{ag.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {CRM_AGENDA_TIPO_LABELS[ag.tipo as keyof typeof CRM_AGENDA_TIPO_LABELS] ??
                    ag.tipo}{" "}
                  · {formatClienteDate(ag.inicio)}
                  {ag.local ? ` · ${ag.local}` : ""}
                </p>
                <Link
                  href={`/${tenantSlug}/clientes/${ag.cliente_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {clientesMap[ag.cliente_id] ?? "Ver cliente"}
                </Link>
              </div>
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{ag.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
