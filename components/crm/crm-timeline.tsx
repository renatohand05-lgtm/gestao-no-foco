"use client";

import { memo, useMemo, useState } from "react";
import {
  Calendar,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  Trophy,
  UserRound,
  XCircle,
  ArrowRightLeft,
  Briefcase,
  Paperclip,
} from "lucide-react";

import { CrmRichContent } from "@/components/crm/crm-rich-editor";
import { SectionCard } from "@/components/ui/section-card";
import { formatClienteDate } from "@/lib/clientes/format";
import type { TimelineDisplayEvent } from "@/types/crm";
import { cn } from "@/lib/utils";

const PAGE = 20;

type CrmTimelineProps = {
  eventos: TimelineDisplayEvent[];
};

type TipoMeta = {
  label: string;
  icon: typeof Phone;
  tone: string;
};

function resolveTipo(tipo: string): TipoMeta {
  const t = tipo.toLowerCase();
  if (/whatsapp|wpp/.test(t)) {
    return { label: "WhatsApp", icon: MessageCircle, tone: "bg-emerald-500" };
  }
  if (/ligacao|ligar|call|telefone|phone/.test(t)) {
    return { label: "Ligação", icon: Phone, tone: "bg-sky-500" };
  }
  if (/email|e-mail|mail/.test(t)) {
    return { label: "E-mail", icon: Mail, tone: "bg-indigo-500" };
  }
  if (/reuniao|reunião|meeting/.test(t)) {
    return { label: "Reunião", icon: Calendar, tone: "bg-violet-500" };
  }
  if (/visita/.test(t)) {
    return { label: "Visita", icon: UserRound, tone: "bg-amber-500" };
  }
  if (/observ|nota|note/.test(t)) {
    return { label: "Observação", icon: StickyNote, tone: "bg-slate-500" };
  }
  if (/etapa|stage|funil|movimento|pipeline/.test(t)) {
    return { label: "Mudança de etapa", icon: ArrowRightLeft, tone: "bg-blue-500" };
  }
  if (/proposta|orcamento|orçamento/.test(t)) {
    return { label: "Proposta", icon: FileText, tone: "bg-fuchsia-500" };
  }
  if (/venda|ganho|ganha|won|fechado/.test(t)) {
    return { label: "Ganho / venda", icon: Trophy, tone: "bg-emerald-600" };
  }
  if (/perda|perdido|lost/.test(t)) {
    return { label: "Perda", icon: XCircle, tone: "bg-red-500" };
  }
  if (/tarefa|follow/.test(t)) {
    return { label: "Follow-up", icon: Briefcase, tone: "bg-orange-500" };
  }
  if (/documento|anexo|arquivo/.test(t)) {
    return { label: "Documento", icon: Paperclip, tone: "bg-teal-500" };
  }
  return { label: tipo || "Evento", icon: StickyNote, tone: "bg-primary" };
}

function hasAttachment(evento: TimelineDisplayEvent): boolean {
  if (evento.referencia_tipo === "cliente_documento" && evento.referencia_id) {
    return true;
  }
  const payload = evento.payload ?? {};
  return Boolean(
    payload.storage_path ||
      payload.documento_id ||
      payload.anexo ||
      payload.attachment,
  );
}

export const CrmTimeline = memo(function CrmTimeline({ eventos }: CrmTimelineProps) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>("all");

  const tipos = useMemo(() => {
    const set = new Set<string>();
    for (const e of eventos) set.add(resolveTipo(e.tipo).label);
    return [...set].sort();
  }, [eventos]);

  const filtered = useMemo(() => {
    if (filter === "all") return eventos;
    return eventos.filter((e) => resolveTipo(e.tipo).label === filter);
  }, [eventos, filter]);

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE),
    [filtered, page],
  );

  if (!eventos.length) {
    return (
      <SectionCard title="Timeline">
        <p className="text-sm text-muted-foreground" data-crm-premium="timeline-empty">
          Nenhuma atividade registrada ainda. Ligações, WhatsApp, e-mails e mudanças
          de etapa aparecerão aqui.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Timeline">
      <div
        className="mb-4 flex flex-wrap items-center gap-2"
        data-crm-premium="timeline"
        role="toolbar"
        aria-label="Filtros da timeline"
      >
        <label className="text-xs text-muted-foreground">
          Tipo
          <select
            className="ml-2 h-8 rounded-md border bg-background px-2 text-sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar timeline por tipo"
          >
            <option value="all">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">
          {filtered.length} evento{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <ol className="relative space-y-4 border-l border-border pl-4">
        {visible.map((evento) => {
          const meta = resolveTipo(evento.tipo);
          const Icon = meta.icon;
          const anexo = hasAttachment(evento);
          return (
            <li key={evento.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[1.45rem] top-1 flex size-5 items-center justify-center rounded-full text-white",
                  meta.tone,
                  evento.sintetico && "opacity-70",
                )}
                aria-hidden
              >
                <Icon className="size-3" />
              </span>
              <div className="space-y-1 rounded-md border border-transparent px-1 py-0.5 transition-colors hover:border-border/80">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{evento.titulo}</p>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </span>
                  {anexo ? (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <Paperclip className="size-3" aria-hidden />
                      Anexo
                    </span>
                  ) : null}
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
                  {evento.autor_nome ? ` · ${evento.autor_nome}` : " · Sistema"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {visible.length < filtered.length ? (
        <button
          type="button"
          className="mt-4 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setPage((p) => p + 1)}
        >
          Carregar mais ({filtered.length - visible.length} restantes)
        </button>
      ) : null}
    </SectionCard>
  );
});
