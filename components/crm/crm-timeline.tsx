"use client";

import { memo, useMemo, useState } from "react";

import { CrmRichContent } from "@/components/crm/crm-rich-editor";
import { SectionCard } from "@/components/ui/section-card";
import { formatClienteDate } from "@/lib/clientes/format";
import type { TimelineDisplayEvent } from "@/types/crm";
import { cn } from "@/lib/utils";

const PAGE = 20;

type CrmTimelineProps = {
  eventos: TimelineDisplayEvent[];
};

export const CrmTimeline = memo(function CrmTimeline({ eventos }: CrmTimelineProps) {
  const [page, setPage] = useState(1);
  const visible = useMemo(
    () => eventos.slice(0, page * PAGE),
    [eventos, page],
  );

  if (!eventos.length) {
    return (
      <SectionCard title="Timeline">
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade registrada ainda.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Timeline">
      <ol className="relative space-y-4 border-l border-border pl-4">
        {visible.map((evento) => (
          <li key={evento.id} className="relative">
            <span
              className={cn(
                "absolute -left-[1.35rem] top-1.5 size-2 rounded-full",
                evento.sintetico ? "bg-muted-foreground" : "bg-primary",
              )}
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{evento.titulo}</p>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {evento.tipo}
                </span>
              </div>
              {evento.descricao ? (
                evento.tipo === "observacao" ? (
                  <CrmRichContent html={evento.descricao} />
                ) : (
                  <p className="text-sm text-muted-foreground">{evento.descricao}</p>
                )
              ) : null}
              <p className="text-xs text-muted-foreground">
                {formatClienteDate(evento.created_at)}
                {evento.autor_nome ? ` · ${evento.autor_nome}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {visible.length < eventos.length ? (
        <button
          type="button"
          className="mt-4 text-sm text-primary hover:underline"
          onClick={() => setPage((p) => p + 1)}
        >
          Carregar mais ({eventos.length - visible.length} restantes)
        </button>
      ) : null}
    </SectionCard>
  );
});
