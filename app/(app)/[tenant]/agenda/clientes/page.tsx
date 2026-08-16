import Link from "next/link";

import { ClientesAgendadosPanel } from "@/components/retention/clientes-agendados-panel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAgendaEventService } from "@/lib/agenda/agenda-service";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
  shiftCivilDate,
} from "@/lib/dashboard/tenant-timezone";
import { clientAppointmentKpis } from "@/lib/retention/kpis";
import { resolveAgendaNature } from "@/lib/retention/natures";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Clientes agendados" };
export const dynamic = "force-dynamic";

export default async function ClientesAgendadosPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : hoje;
  const svc = await createAgendaEventService(tenant.id);
  let rows: Awaited<ReturnType<typeof svc.listRange>> = [];
  try {
    rows = await svc.listRange(`${day}T00:00:00.000Z`, `${day}T23:59:59.999Z`);
  } catch {
    rows = [];
  }
  const clientRows = rows.filter((r) => resolveAgendaNature(r) === "cliente");
  const kpis = clientAppointmentKpis(clientRows, day, DEFAULT_TENANT_TIMEZONE);
  const supabase = await createClient();
  const clienteIds = [...new Set(clientRows.map((r) => r.cliente_id).filter(Boolean))] as string[];
  const profissionalIds = [
    ...new Set(clientRows.map((r) => r.responsavel_id).filter(Boolean)),
  ] as string[];
  const [{ data: clientes }, { data: profs }, { data: produtos }] = await Promise.all([
    clienteIds.length
      ? supabase
          .from("clientes")
          .select("id, nome, telefone, whatsapp, email")
          .eq("tenant_id", tenant.id)
          .in("id", clienteIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    profissionalIds.length
      ? supabase
          .from("mecanicos" as never)
          .select("id, nome_completo")
          .eq("tenant_id", tenant.id)
          .in("id", profissionalIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    supabase
      .from("produtos")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .limit(200),
  ]);
  const clienteMap = new Map(
    (clientes ?? []).map((c) => [
      String((c as { id: string }).id),
      c as {
        nome: string;
        telefone: string | null;
        whatsapp: string | null;
        email: string | null;
      },
    ]),
  );
  const profMap = new Map(
    ((profs ?? []) as Array<{ id: string; nome_completo: string }>).map((p) => [
      p.id,
      p.nome_completo,
    ]),
  );
  const prodMap = new Map(
    (produtos ?? []).map((p) => [p.id, p.nome]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Clientes agendados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {day} · somente natureza cliente (reuniões internas fora destes KPIs).
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link className="underline" href={`/${tenantSlug}/agenda`}>
            Voltar à agenda
          </Link>
          <Link
            className="underline"
            href={`/${tenantSlug}/agenda/clientes?day=${shiftCivilDate(day, -1)}`}
          >
            Dia anterior
          </Link>
          <Link
            className="underline"
            href={`/${tenantSlug}/agenda/clientes?day=${shiftCivilDate(day, 1)}`}
          >
            Próximo dia
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Hoje / período", kpis.agendadosHoje],
          ["Aguardando confirmação", kpis.aguardandoConfirmacao],
          ["Confirmados", kpis.confirmados],
          ["Em atendimento", kpis.emAtendimento],
          ["Concluídos", kpis.concluidos],
          ["Cancelados", kpis.cancelados],
          ["Não compareceram", kpis.naoCompareceram],
          ["Reagendados", kpis.reagendados],
        ].map(([label, n]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-1">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{n}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <ClientesAgendadosPanel
        tenantSlug={tenantSlug}
        rows={clientRows.map((r) => {
          const extra = r as typeof r & { servico_id?: string | null };
          const c = r.cliente_id ? clienteMap.get(r.cliente_id) : null;
          return {
            id: r.id,
            inicio: r.inicio,
            fim: r.fim,
            status: r.status,
            clienteId: r.cliente_id,
            clienteNome: c?.nome ?? r.titulo,
            servico: extra.servico_id
              ? (prodMap.get(extra.servico_id) ?? r.titulo)
              : r.titulo,
            profissional: r.responsavel_id
              ? (profMap.get(r.responsavel_id) ?? "—")
              : "—",
            telefone: c?.whatsapp ?? c?.telefone ?? null,
            email: c?.email ?? null,
          };
        })}
      />
    </div>
  );
}
