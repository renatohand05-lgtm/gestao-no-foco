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
import { createClienteService } from "@/lib/clientes/cliente-service";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
  shiftCivilDate,
} from "@/lib/dashboard/tenant-timezone";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { createVeiculoService } from "@/lib/ordens/veiculo-service";
import { clientAppointmentKpis } from "@/lib/retention/kpis";
import { resolveAgendaNature } from "@/lib/retention/natures";
import { parseAgendaCreateContext } from "@/lib/ux/fast-input";
import { tenantHasMutationPermission } from "@/lib/rbac/mutation-auth";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
import { serviceSuggestionsForContext } from "@/lib/segments/catalogs/suggest.ts";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Agenda Enterprise" };
export const dynamic = "force-dynamic";

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    view?: string;
    day?: string;
    natureza?: string;
    cliente_id?: string;
    servico_id?: string;
    profissional_id?: string;
    return_id?: string;
    inicio?: string;
    from?: string;
  }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const initial = parseAgendaCreateContext(sp);
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
    cliente_id: string | null;
    origem: string | null;
    natureza?: string | null;
    ordem_servico_id?: string | null;
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
      cliente_id: r.cliente_id,
      origem: r.origem,
      natureza: (r as { natureza?: string | null }).natureza ?? r.origem,
      ordem_servico_id: r.ordem_servico_id,
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
          cliente_id: (r.cliente_id as string | null) ?? null,
          origem: "cliente",
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

  const kpis = clientAppointmentKpis(events, hoje, DEFAULT_TENANT_TIMEZONE);
  const negocioCount = events.filter(
    (e) => resolveAgendaNature(e) === "negocio",
  ).length;
  const internoCount = events.filter(
    (e) => resolveAgendaNature(e) === "interno",
  ).length;

  const [clientesRes, servicosRes, profsRes] = schemaReady
    ? await Promise.all([
        createClienteService(tenant.id).then((s) => s.list({ perPage: 100 })),
        createProdutoService(tenant.id).then((s) =>
          s.list({ tipo: "servico", perPage: 100, ativo: true }),
        ),
        createMecanicoService(tenant.id).then((s) => s.listDisponiveis()),
      ])
    : [null, null, null];

  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const ui = getSegmentUiCopy(ctx);
  const library = schemaReady
    ? serviceSuggestionsForContext(ctx, { includeCombos: false })
    : [];
  const canCreateProduto = schemaReady
    ? await tenantHasMutationPermission(tenantSlug, "produtos.criar")
    : false;
  const canStartAttendance = ui.createsWorkOrderFromAgenda
    ? await tenantHasMutationPermission(tenantSlug, "os.criar")
    : true;

  let initialVeiculos: import("@/lib/ordens/veiculo-shared").VeiculoOption[] =
    [];
  if (schemaReady && ui.showVehicles && initial.clienteId) {
    const veiculoSvc = await createVeiculoService(tenant.id);
    initialVeiculos = await veiculoSvc.listOptionsByCliente(initial.clienteId);
  }

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
            href={`/${tenantSlug}/agenda/clientes`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Clientes agendados
          </Link>
          <Link
            href={`/${tenantSlug}/crm/retornos`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Retornos
          </Link>
          <Link
            href={`/${tenantSlug}/crm/agenda`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Agenda CRM
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-phase35="agenda-kpis">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Clientes agendados hoje</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {kpis.agendadosHoje}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Confirmados</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {kpis.confirmados}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Em atendimento</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {kpis.emAtendimento}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Não misturar negócio/interno</CardDescription>
            <CardTitle className="text-sm font-medium">
              {negocioCount} negócios · {internoCount} internos · {conflictCount} conflitos
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {schemaReady ? (
        <AgendaEventCreateForm
          tenantSlug={tenantSlug}
          initial={initial}
          library={library}
          canCreateProduto={canCreateProduto}
          clientes={(clientesRes?.data ?? []).map((c) => ({
            id: c.id,
            label: c.nome,
          }))}
          servicos={(servicosRes?.data ?? []).map((s) => ({
            id: s.id,
            label: s.nome,
            minutes: s.tempo_estimado_minutos ?? null,
          }))}
          profissionais={(profsRes ?? []).map((p) => ({
            id: p.id,
            label: p.nome_completo,
          }))}
          showVehicles={ui.showVehicles}
          initialVeiculos={initialVeiculos}
        />
      ) : null}

      {view === "semana" || view === "dia" || view === "mes" ? (
        <AgendaWeekBoard
          tenantSlug={tenantSlug}
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
        canStartAttendance={canStartAttendance}
        copy={{
          confirmAppointmentLabel: ui.confirmAppointmentLabel,
          clientArrivedLabel: ui.clientArrivedLabel,
          startAttendanceLabel: ui.startAttendanceLabel,
          rescheduleAppointmentLabel: ui.rescheduleAppointmentLabel,
          noShowLabel: ui.noShowLabel,
          workOrder: ui.workOrder,
        }}
        events={events.map((e) => ({
          id: e.id,
          titulo: e.titulo,
          inicio: e.inicio,
          fim: e.fim,
          tipo: e.tipo,
          status: e.status,
          natureza: e.natureza ?? e.origem,
          origem: e.origem,
          ordem_servico_id: e.ordem_servico_id ?? null,
        }))}
      />
    </div>
  );
}
