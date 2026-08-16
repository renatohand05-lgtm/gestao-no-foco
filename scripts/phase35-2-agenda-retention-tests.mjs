#!/usr/bin/env node
/**
 * Sprint 35.2 — Agenda naturezas, retornos, outbox, opt-out, idempotência.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

const ENGINE = { segmentVersion: 1 };
const MIG = "supabase/migrations/20260902_phase35_2_agenda_returns_notifications.sql";

describe("35.2 evidência, migration e segurança", () => {
  it("docs e migration aditiva existem", () => {
    assert.ok(existsSync(join(root, MIG)));
    assert.ok(existsSync(join(root, "docs/product/APPOINTMENTS_AND_RETENTION.md")));
    assert.ok(existsSync(join(root, "docs/operations/NOTIFICATION_RUNBOOK.md")));
    assert.ok(existsSync(join(root, "docs/testing/evidence/35-2/REPORT.md")));
    const sql = read(MIG);
    assert.match(sql, /customer_returns/);
    assert.match(sql, /notification_outbox/);
    assert.match(sql, /communication_preferences/);
    assert.match(sql, /service_return_rules/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /tenant_members/);
    assert.doesNotMatch(sql, /\bDELETE FROM\b/);
    assert.doesNotMatch(sql, /\bDROP TABLE\b/);
  });

  it("não toca billing nem WhatsApp provider real", () => {
    for (const f of [
      "lib/retention/actions.ts",
      "lib/retention/process.ts",
      "lib/retention/channels.ts",
      "app/api/cron/retention/route.ts",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /asaas/i);
      assert.doesNotMatch(src, /stripe/i);
      assert.doesNotMatch(src, /graph\.facebook/i);
      assert.doesNotMatch(src, /twilio\.com/i);
      assert.doesNotMatch(src, /setTimeout\(/);
    }
  });

  it("cron exige CRON_SECRET e não dispara provider", () => {
    const src = read("app/api/cron/retention/route.ts");
    assert.match(src, /CRON_SECRET/);
    assert.match(src, /401/);
    assert.match(src, /DISABLED/);
    const job = read("lib/retention/process.ts");
    assert.match(job, /dry_run/);
    assert.doesNotMatch(job, /mode: "provider"/);
  });

  it("serviços 35.2 filtram tenant_id", () => {
    for (const f of [
      "lib/retention/return-service.ts",
      "lib/retention/outbox-service.ts",
      "lib/retention/prefs-service.ts",
      "lib/retention/rule-service.ts",
    ]) {
      const src = read(f);
      assert.match(src, /\.eq\("tenant_id"/);
      assert.match(src, /isMissingRelation/);
    }
    assert.match(read("lib/retention/actions.ts"), /requireTenantMutationPermission/);
  });
});

describe("35.2 naturezas e KPIs de agenda", () => {
  it("KPIs de cliente ignoram reunião interna/negócio", async () => {
    const { clientAppointmentKpis } = await load("lib/retention/kpis.ts");
    const { resolveAgendaNature } = await load("lib/retention/natures.ts");
    const today = "2026-08-16";
    const events = [
      {
        id: "1",
        inicio: "2026-08-16T12:00:00.000Z",
        status: "confirmado",
        cliente_id: "c1",
        origem: "cliente",
      },
      {
        id: "2",
        inicio: "2026-08-16T13:00:00.000Z",
        status: "confirmado",
        tipo: "reuniao_interna",
        origem: "interno",
      },
      {
        id: "3",
        inicio: "2026-08-16T14:00:00.000Z",
        status: "confirmado",
        origem: "negocio",
      },
    ];
    assert.equal(resolveAgendaNature(events[0]), "cliente");
    assert.equal(resolveAgendaNature(events[1]), "interno");
    assert.equal(resolveAgendaNature(events[2]), "negocio");
    const kpis = clientAppointmentKpis(events, today, "UTC");
    assert.equal(kpis.agendadosHoje, 1);
    assert.equal(kpis.confirmados, 1);
  });

  it("duração do serviço preenche fim", async () => {
    const { endIsoFromDuration, durationMinutesBetween } = await load(
      "lib/retention/natures.ts",
    );
    const end = endIsoFromDuration("2026-08-16T12:00:00.000Z", 45);
    assert.equal(durationMinutesBetween("2026-08-16T12:00:00.000Z", end), 45);
  });

  it("conflito de indisponibilidade usa o motor existente", async () => {
    const { detectAgendaConflicts } = await load("lib/agenda/conflict.ts");
    const hits = detectAgendaConflicts(
      {
        inicio: "2026-08-16T12:00:00.000Z",
        fim: "2026-08-16T13:00:00.000Z",
        responsavelId: "p1",
      },
      [
        {
          id: "block",
          inicio: "2026-08-16T11:30:00.000Z",
          fim: "2026-08-16T12:30:00.000Z",
          responsavelId: "p1",
        },
      ],
    );
    assert.ok(hits.some((h) => h.type === "profissional_ocupado"));
  });

  it("status concluído não bloqueia (filtro NON_BLOCKING)", async () => {
    const { NON_BLOCKING_STATUSES } = await load("lib/retention/natures.ts");
    assert.equal(NON_BLOCKING_STATUSES.has("cancelado"), true);
    assert.equal(NON_BLOCKING_STATUSES.has("concluido"), true);
    assert.equal(NON_BLOCKING_STATUSES.has("agendado"), false);
  });
});

describe("35.2 retornos por segmento", () => {
  it("manual + automática por serviço (defaults)", async () => {
    const {
      computeDueDate,
      defaultReturnRuleForSegment,
      classifyReturnDue,
    } = await load("lib/retention/returns.ts");
    assert.equal(
      computeDueDate({
        fromCivilDate: "2026-08-16",
        rule: { intervalDays: 15, intervalMonths: null },
      }),
      "2026-08-31",
    );
    const oficina = defaultReturnRuleForSegment("oficina");
    assert.equal(oficina.returnType, "data_ou_km");
    assert.equal(oficina.mileageKm, 10000);
    const barb = defaultReturnRuleForSegment("barbearia");
    assert.equal(barb.intervalDays, 30);
    const lava = defaultReturnRuleForSegment("lava_rapido");
    assert.equal(lava.intervalDays, 15);
    const est = defaultReturnRuleForSegment("clinica_estetica");
    assert.equal(est.hideProcedure, true);
    const odonto = defaultReturnRuleForSegment("consultorio_odontologico");
    assert.equal(odonto.hideProcedure, true);
    const cons = defaultReturnRuleForSegment("consultoria");
    assert.equal(cons.returnType, "follow_up");
    assert.equal(
      classifyReturnDue({
        dueAt: "2026-08-10",
        todayCivil: "2026-08-16",
        status: "previsto",
      }),
      "atrasado",
    );
  });

  it("oficina km", async () => {
    const { computeNextKm, isKmDue } = await load("lib/retention/returns.ts");
    assert.equal(computeNextKm(50000, 10000), 60000);
    assert.equal(isKmDue({ lastKm: 60000, nextKm: 60000 }), true);
    assert.equal(isKmDue({ lastKm: 40000, nextKm: 60000 }), false);
  });
});

describe("35.2 comunicação, idempotência, opt-out, timezone", () => {
  it("D-10 D-3 e idempotência da fila", async () => {
    const { planRetentionNotifications, localHourInTimezone } = await load(
      "lib/retention/job.ts",
    );
    const { communicationIdempotencyKey } = await load(
      "lib/retention/idempotency.ts",
    );
    const noon = new Date("2026-08-06T15:00:00.000Z");
    const hour = localHourInTimezone(noon, "America/Sao_Paulo");
    const planned = planRetentionNotifications({
      tenantId: "tA",
      todayCivil: "2026-08-06",
      hourLocal: hour,
      segment: "oficina",
      existingKeys: [],
      returns: [
        {
          id: "r1",
          tenant_id: "tA",
          cliente_id: "c1",
          due_at: "2026-08-16",
          status: "previsto",
          hide_procedure: false,
        },
      ],
    });
    const d10 = planned.filter((p) => p.offsetKey === "D-10");
    assert.equal(d10.length, 2);
    const again = planRetentionNotifications({
      tenantId: "tA",
      todayCivil: "2026-08-06",
      hourLocal: hour,
      segment: "oficina",
      existingKeys: planned.map((p) => p.idempotencyKey),
      returns: [
        {
          id: "r1",
          tenant_id: "tA",
          cliente_id: "c1",
          due_at: "2026-08-16",
          status: "previsto",
          hide_procedure: false,
        },
      ],
    });
    assert.equal(again.length, 0);
    const k = communicationIdempotencyKey({
      tenantId: "tA",
      clienteId: "c1",
      entityType: "retorno",
      entityId: "r1",
      templateCode: "RETORNO_D10",
      offsetKey: "D-10",
      channel: "whatsapp",
    });
    assert.ok(k.includes("tA"));
  });

  it("D-3 dispara no dia correto", async () => {
    const { planRetentionNotifications } = await load("lib/retention/job.ts");
    const planned = planRetentionNotifications({
      tenantId: "tA",
      todayCivil: "2026-08-13",
      hourLocal: 10,
      segment: "barbearia",
      existingKeys: [],
      returns: [
        {
          id: "r1",
          tenant_id: "tA",
          cliente_id: "c1",
          due_at: "2026-08-16",
          status: "previsto",
          hide_procedure: false,
        },
      ],
    });
    assert.ok(planned.some((p) => p.offsetKey === "D-3"));
  });

  it("fora da janela 08-19 não planeja", async () => {
    const { planRetentionNotifications } = await load("lib/retention/job.ts");
    const planned = planRetentionNotifications({
      tenantId: "tA",
      todayCivil: "2026-08-16",
      hourLocal: 3,
      segment: "oficina",
      existingKeys: [],
      returns: [
        {
          id: "r1",
          tenant_id: "tA",
          cliente_id: "c1",
          due_at: "2026-08-16",
          status: "previsto",
          hide_procedure: false,
        },
      ],
    });
    assert.equal(planned.length, 0);
  });

  it("opt-out, disabled, dry-run, manual link nunca fingem DELIVERED", async () => {
    const { decideDispatch, buildWaMeLink } = await load(
      "lib/retention/channels.ts",
    );
    assert.equal(
      decideDispatch({
        mode: "dry_run",
        channel: "whatsapp",
        optedIn: false,
        phone: "11999999999",
        message: "oi",
      }).status,
      "cancelled",
    );
    assert.equal(
      decideDispatch({
        mode: "disabled",
        channel: "whatsapp",
        optedIn: true,
        phone: "11999999999",
        message: "oi",
      }).status,
      "cancelled",
    );
    const dry = decideDispatch({
      mode: "dry_run",
      channel: "whatsapp",
      optedIn: true,
      phone: "11999999999",
      message: "oi",
    });
    assert.equal(dry.status, "dry_run");
    const manual = decideDispatch({
      mode: "manual_link",
      channel: "whatsapp",
      optedIn: true,
      phone: "11999999999",
      message: "oi",
    });
    assert.equal(manual.status, "manual_opened");
    assert.ok(manual.waLink?.startsWith("https://wa.me/"));
    assert.ok(buildWaMeLink("11999999999", "olá").includes("wa.me"));
    const email = decideDispatch({
      mode: "dry_run",
      channel: "email",
      optedIn: true,
      email: "a@b.com",
      message: "oi",
    });
    assert.equal(email.status, "dry_run");
    assert.notEqual(email.status, "delivered");
  });

  it("templates interpolam só variáveis seguras e escondem procedimento", async () => {
    const { renderTemplate, templateFor } = await load(
      "lib/retention/templates.ts",
    );
    const privateTpl = templateFor({
      code: "RETORNO_D3",
      segment: "clinica_estetica",
      hideProcedure: true,
    });
    assert.doesNotMatch(privateTpl, /\{\{servico\}\}/);
    const out = renderTemplate("Oi {{cliente_nome}} {{nao_existe}} ${process}", {
      cliente_nome: "João",
    });
    assert.equal(out.includes("João"), true);
    assert.equal(out.includes("process"), true);
    assert.doesNotMatch(out, /\{\{/);
  });
});

describe("35.2 RBAC, isolamento, capabilities, UI", () => {
  it("permissões de retornos no catálogo", async () => {
    const { PERMISSION_CATALOG } = await load("lib/rbac/permissions.ts");
    const keys = new Set(PERMISSION_CATALOG.map((p) => p.key));
    for (const k of [
      "agenda.visualizar",
      "crm.retornos.visualizar",
      "crm.retornos.criar",
      "crm.retornos.editar",
      "crm.retornos.contatar",
      "crm.notificacoes.enviar",
    ]) {
      assert.ok(keys.has(k), k);
    }
  });

  it("cross-tenant: query sempre eq tenant_id", () => {
    const svc = read("lib/agenda/agenda-service.ts");
    assert.match(svc, /\.eq\("tenant_id", this\.tenantId\)/);
    const ret = read("lib/retention/return-service.ts");
    assert.match(ret, /Evento não encontrado neste tenant|não encontrado neste tenant/);
  });

  it("capabilities 35.2 em todos os segmentos + aliases", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    for (const segment of [
      "oficina",
      "barbearia",
      "lava_rapido",
      "clinica_estetica",
      "consultorio_odontologico",
      "consultoria",
    ]) {
      const ctx = resolveSegmentContext({ segment, ...ENGINE });
      assert.equal(hasCapability(ctx, "appointments"), true, segment);
      assert.equal(hasCapability(ctx, "client_appointments"), true, segment);
      assert.equal(hasCapability(ctx, "customer_returns"), true, segment);
      assert.equal(hasCapability(ctx, "customer_retention"), true, segment);
    }
  });

  it("UI agenda/retornos/CO/mobile/histórico", () => {
    assert.match(read("app/(app)/[tenant]/agenda/page.tsx"), /Clientes agendados/);
    assert.match(
      read("app/(app)/[tenant]/agenda/clientes/page.tsx"),
      /clientes-agendados|Clientes agendados/,
    );
    assert.match(
      read("app/(app)/[tenant]/crm/retornos/page.tsx"),
      /Retornos e fidelização/,
    );
    assert.match(
      read("app/(app)/[tenant]/centro-operacoes/page.tsx"),
      /ops-retornos/,
    );
    assert.match(read("components/clientes/cliente-workspace.tsx"), /retornos/);
    assert.match(read("lib/mobile/operations-compose.ts"), /retornos/);
    assert.match(read("components/agenda/agenda-event-create-form.tsx"), /natureza/);
  });
});
