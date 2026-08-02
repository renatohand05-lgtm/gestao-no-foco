import Link from "next/link";

import { AgendaEventCreateForm } from "@/components/agenda/agenda-event-create-form";
import { AgendaEventListActions } from "@/components/agenda/agenda-event-list-actions";
import { AgendaWeekBoard } from "@/components/agenda/agenda-week-board";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { detectAgendaConflicts } from "@/lib/agenda/conflict";
import { createAgendaEventService } from "@/lib/agenda/agenda-service";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
  shiftCivilDate,
} from "@/lib/dashboard/tenant-timezone";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Agenda Enterprise" };
export const dynamic = "force-dynamic";

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ view?: string; day?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const view = sp.view ?? "semana";
  const tenant = await requireTenant(tenantSlug);
  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const anchor = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : hoje;

  let rangeStart = anchor;
  let rangeEnd = anchor;
  if (view === "semana") {
    rangeStart = anchor;
    rangeEnd = shiftCivilDate(anchor, 6);
  } else if (view === "mes") {
    const [y, m] = anchor.split("-").map(Number);
    rangeStart = `${y}-${String(m).padStart(2, "0")}-01`;
    rangeEnd = shiftCivilDate(rangeStart, 30);
  } else {
    rangeStart = anchor;
    rangeEnd = anchor;
  }

  let events: Array<{
    id: string;
    titulo: string;
    inicio: string;
    fim: string;
    tipo: string;
    status: string;
    responsavelId: string | null;
    recursoId: string | null;
  }> = [];
  let schemaReady = false;
  let bridgeNote: string | null = null;

  try {
    const svc = await createAgendaEventService(tenant.id);
    const rows = await svc.listRange(
      `${rangeStart}T00:00:00.000Z`,
      `${rangeEnd}T23:59:59.999Z`,
    );
    schemaReady = true;
    events = rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      inicio: r.inicio,
      fim: r.fim,
      tipo: r.tipo ?? "compromisso",
      status: r.status ?? "agendado",
      responsavelId: r.responsavel_id ?? null,
      recursoId: r.recurso_id ?? null,
    }));
  } catch {
    bridgeNote =
      "Tabela agenda_eventos indisponível (migration 28.5). Ponte CRM.";
    const supabase = await createClient();
    const legacy = await supabase
      .from("cliente_agendamentos" as never)
      .select("id, titulo, inicio, fim, tipo, responsavel_id, status")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .gte("inicio", `${rangeStart}T00:00:00`)
      .lte("inicio", `${rangeEnd}T23:59:59`)
      .limit(200);
    if (!legacy.error && legacy.data) {
      events = (legacy.data as Array<Record<string, unknown>>).map((r) => {
        const inicio = String(r.inicio ?? "");
        const fim = String(r.fim ?? inicio);
        return {
          id: String(r.id),
          titulo: String(r.titulo ?? "Agendamento"),
          inicio: inicio.includes("T")
            ? inicio
            : `${inicio.slice(0, 10)}T09:00:00`,
          fim: fim.includes("T") ? fim : `${fim.slice(0, 10)}T10:00:00`,
          tipo: String(r.tipo ?? "compromisso"),
          status: String(r.status ?? "agendado"),
          responsavelId: (r.responsavel_id as string | null) ?? null,
          recursoId: null,
        };
      });
    }
  }

  const conflictCount = events.reduce((acc, ev, idx) => {
    const others = events.filter((_, i) => i !== idx);
    return (
      acc +
      detectAgendaConflicts(
        {
          id: ev.id,
          inicio: ev.inicio,
          fim: ev.fim,
          responsavelId: ev.responsavelId,
          recursoId: ev.recursoId,
        },
        others.map((o) => ({
          id: o.id,
          inicio: o.inicio,
          fim: o.fim,
          responsavelId: o.responsavelId,
          recursoId: o.recursoId,
        })),
      ).length
    );
  }, 0);

  const views = [
    { key: "dia", label: "Dia" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mês" },
    { key: "lista", label: "Lista" },
  ] as const;

  return (
    <div className="space-y-6" data-phase28="agenda">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agenda Enterprise
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rangeStart} → {rangeEnd} · Google/Outlook: aguardando integração.
          </p>
          {bridgeNote ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              {bridgeNote}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {views.map((v) => (
            <Link
              key={v.key}
              href={`/${tenantSlug}/agenda?view=${v.key}&day=${anchor}`}
              className={`rounded-md border px-3 py-1.5 hover:bg-muted ${
                view === v.key ? "bg-muted font-medium" : ""
              }`}
            >
              {v.label}
            </Link>
          ))}
          <Link
            href={`/${tenantSlug}/crm/agenda`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Agenda CRM
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Eventos no período</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {events.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Sinais de conflito</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {conflictCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Schema 28.5</CardDescription>
            <CardTitle className="text-xl">
              {schemaReady ? "Ativo" : "Pendente"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {schemaReady ? <AgendaEventCreateForm tenantSlug={tenantSlug} /> : null}

      {view === "semana" || view === "dia" || view === "mes" ? (
        <AgendaWeekBoard
          weekStart={view === "semana" ? rangeStart : rangeStart}
          events={events.map((e) => ({
            id: e.id,
            title: e.titulo,
            start: e.inicio,
            end: e.fim,
            tipo: e.tipo,
          }))}
        />
      ) : null}

      <AgendaEventListActions
        tenantSlug={tenantSlug}
        events={events.map((e) => ({
          id: e.id,
          titulo: e.titulo,
          inicio: e.inicio,
          fim: e.fim,
          tipo: e.tipo,
          status: e.status,
        }))}
      />
    </div>
  );
}
