#!/usr/bin/env node
/**
 * Sprint 35.2.3 — production readiness (sem envio real, sem live).
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

const MIG = "supabase/migrations/20260904_phase35_2_3_notification_readiness.sql";

describe("35.2.3 evidência e segurança", () => {
  it("migration aditiva e docs", () => {
    assert.ok(existsSync(join(root, MIG)));
    assert.ok(existsSync(join(root, "docs/product/NOTIFICATIONS.md")));
    assert.ok(existsSync(join(root, "docs/operations/NOTIFICATION_RUNBOOK.md")));
    assert.ok(existsSync(join(root, "app/(app)/[tenant]/crm/comunicacoes/page.tsx")));
    const sql = read(MIG).replace(/--.*$/gm, "");
    assert.match(sql, /next_retry_at/);
    assert.match(sql, /correlation_id/);
    assert.match(sql, /origin_kind/);
    assert.match(sql, /opted_out_origin/);
    assert.doesNotMatch(sql, /\bDELETE FROM\b/);
    assert.doesNotMatch(sql, /\bDROP TABLE\b/);
  });

  it("não ativa live, cron, billing nem 35.3", () => {
    const env = read(".env.example");
    assert.match(env, /COMMUNICATION_MODE=test/);
    assert.doesNotMatch(env, /COMMUNICATION_MODE=live/);
    assert.match(read("app/api/cron/retention/route.ts"), /production: "DISABLED"/);
    assert.doesNotMatch(read("lib/retention/process.ts"), /mode: "provider"/);
    for (const f of [
      "lib/retention/process.ts",
      "lib/retention/actions.ts",
      "lib/retention/channels.ts",
      "app/api/cron/retention/route.ts",
    ]) {
      assert.doesNotMatch(read(f), /graph\.facebook/);
      assert.doesNotMatch(read(f), /asaas/i);
      assert.doesNotMatch(read(f), /stripe/i);
    }
  });
});

describe("35.2.3 tenant isolation / RBAC", () => {
  it("outbox e central sempre filtram tenant", () => {
    assert.match(read("lib/retention/outbox-service.ts"), /\.eq\("tenant_id"/);
    assert.match(read("lib/retention/center-service.ts"), /\.eq\("tenant_id", input\.tenantId\)/);
    assert.match(read("lib/retention/actions.ts"), /crm\.notificacoes\.enviar/);
    assert.match(read("lib/retention/actions.ts"), /resendFailedNotificationAction/);
  });

  it("filtro de centro rejeita outro tenant", async () => {
    const { filterCenterRows } = await load("lib/retention/center.ts");
    const rows = [
      { tenant_id: "a", channel: "whatsapp", status: "sent", cliente_id: "c1" },
      { tenant_id: "b", channel: "whatsapp", status: "sent", cliente_id: "c1" },
    ];
    const onlyA = filterCenterRows(rows, { tenantId: "a" });
    assert.equal(onlyA.length, 1);
    assert.equal(onlyA[0].tenant_id, "a");
  });

  it("reenvio recusa cross-tenant", async () => {
    const { canManualResend } = await load("lib/retention/resend.ts");
    const blocked = canManualResend({
      actorTenantId: "t1",
      rowTenantId: "t2",
      status: "failed",
      optedIn: true,
      hasDestination: true,
    });
    assert.equal(blocked.ok, false);
  });
});

describe("35.2.3 pipeline / opt-out / retry", () => {
  it("opt-out persiste suppressed; decideDispatch permanece cancelled", async () => {
    const { decideDispatch } = await load("lib/retention/channels.ts");
    const { persistOutboxStatus, operatorStatusLabel, canAdvanceStatus } =
      await load("lib/retention/pipeline.ts");
    const decision = decideDispatch({
      mode: "dry_run",
      channel: "whatsapp",
      optedIn: false,
      phone: "1199",
      message: "x",
    });
    assert.equal(decision.status, "cancelled");
    assert.equal(
      persistOutboxStatus({
        decisionStatus: decision.status,
        optedIn: false,
      }),
      "suppressed",
    );
    assert.equal(operatorStatusLabel("sent"), "Enviado");
    assert.equal(operatorStatusLabel("delivered"), "Entregue");
    assert.equal(operatorStatusLabel("failed"), "Falhou");
    assert.equal(canAdvanceStatus("delivered", "sent"), false);
    assert.equal(canAdvanceStatus("sent", "delivered"), true);
  });

  it("dedupe/idempotency mesma chave OS", async () => {
    const { communicationIdempotencyKey } = await load(
      "lib/retention/idempotency.ts",
    );
    const key = communicationIdempotencyKey({
      tenantId: "t",
      clienteId: "c",
      entityType: "os",
      entityId: "os1",
      templateCode: "SERVICE_READY",
      offsetKey: "SERVICE_READY",
      channel: "whatsapp",
    });
    assert.equal(
      key,
      communicationIdempotencyKey({
        tenantId: "t",
        clienteId: "c",
        entityType: "os",
        entityId: "os1",
        templateCode: "SERVICE_READY",
        offsetKey: "SERVICE_READY",
        channel: "whatsapp",
      }),
    );
  });

  it("retry transiente na mesma linha; permanente não agenda", async () => {
    const { planRetry, classifyFailure } = await load("lib/retention/failures.ts");
    assert.equal(classifyFailure({ httpStatus: 429 }), "transient");
    const transient = planRetry({
      httpStatus: 503,
      attemptCount: 1,
      lastAttemptAt: null,
    });
    assert.equal(transient.sameRow, true);
    assert.equal(transient.retry, true);
    assert.ok(transient.nextRetryAt);
    const permanent = planRetry({
      errorCode: "opt_out",
      attemptCount: 0,
    });
    assert.equal(permanent.retry, false);
    assert.equal(permanent.nextRetryAt, null);
    assert.equal(classifyFailure({ errorCode: "invalid_template" }), "permanent");
    assert.equal(classifyFailure({ errorCode: "missing_phone" }), "permanent");
  });
});

describe("35.2.3 webhook / test mode", () => {
  it("webhook fora de ordem e duplicata persistida pelo event_id", async () => {
    const { canAdvanceStatus } = await load("lib/retention/pipeline.ts");
    assert.equal(canAdvanceStatus("read", "delivered"), false);
    assert.equal(canAdvanceStatus("delivered", "read"), true);
    assert.equal(canAdvanceStatus("cancelled", "sent"), false);
    const webhook = read("lib/retention/webhook.ts");
    assert.match(webhook, /duplicated/);
    assert.match(webhook, /invalid_signature|Assinatura inválida/);
    assert.match(webhook, /ignored_out_of_order|canAdvanceStatus/);
    const route = read("app/api/webhooks/whatsapp/route.ts");
    assert.match(route, /status: 401/);
  });

  it("test allowlist e disabled mode", async () => {
    const {
      allowRealProviderSend,
      resolveCommunicationMode,
      isTestAllowlisted,
    } = await load("lib/retention/test-mode.ts");
    assert.equal(resolveCommunicationMode({}), "test");
    assert.equal(
      resolveCommunicationMode({ COMMUNICATION_MODE: "disabled" }),
      "disabled",
    );
    const env = {
      COMMUNICATION_MODE: "test",
      COMMUNICATION_TEST_ALLOWLIST: "11988887777,dono@example.com",
      WHATSAPP_ENABLED: "true",
    };
    assert.equal(isTestAllowlisted({ phone: "11988887777", env }), true);
    assert.equal(isTestAllowlisted({ phone: "11900000000", env }), false);
    assert.equal(
      allowRealProviderSend({
        channel: "whatsapp",
        phone: "11900000000",
        env,
      }),
      false,
    );
    assert.equal(
      allowRealProviderSend({
        channel: "whatsapp",
        phone: "11988887777",
        env: { ...env, COMMUNICATION_MODE: "disabled" },
      }),
      false,
    );
    assert.equal(
      allowRealProviderSend({
        channel: "whatsapp",
        phone: "11988887777",
        env: { COMMUNICATION_MODE: "live", WHATSAPP_ENABLED: "false" },
      }),
      false,
    );
  });
});

describe("35.2.3 UI / segmentos / privacidade clínica / mobile", () => {
  it("central, timeline e templates de segmento", async () => {
    const center = read("app/(app)/[tenant]/crm/comunicacoes/page.tsx");
    assert.match(center, /CommunicationCenter/);
    assert.match(read("components/clientes/cliente-workspace.tsx"), /comunicacoes/);
    assert.doesNotMatch(
      read("app/(app)/[tenant]/crm/comunicacoes/page.tsx"),
      /if \(segment === ["']oficina["']\)/,
    );
    assert.doesNotMatch(
      read("components/retention/communication-center.tsx"),
      /if \(segment ===/,
    );
    const { templateFor } = await load("lib/retention/templates.ts");
    const oficina = templateFor({ code: "SERVICE_READY", segment: "oficina" });
    const lava = templateFor({ code: "SERVICE_READY", segment: "lava_rapido" });
    const barb = templateFor({
      code: "AGENDAMENTO_CRIADO",
      segment: "barbearia",
    });
    const cons = templateFor({
      code: "AGENDAMENTO_CRIADO",
      segment: "consultoria",
    });
    assert.match(oficina, /veículo está pronto/i);
    assert.match(lava, /pronto para retirada|disponível para retirada/i);
    assert.match(barb, /horário está confirmado/i);
    assert.match(cons, /reunião está confirmada/i);
    const odonto = templateFor({
      code: "RETORNO_D3",
      segment: "consultorio_odontologico",
    });
    const estetica = templateFor({
      code: "SERVICE_READY",
      segment: "clinica_estetica",
    });
    assert.doesNotMatch(odonto, /diagnóstico|procedimento|clínico/i);
    assert.doesNotMatch(estetica, /diagnóstico|procedimento|clínico/i);
  });

  it("mobile rendering (min-h-11) e copy operacional", () => {
    assert.match(read("components/retention/communication-center.tsx"), /min-h-11/);
    assert.match(read("components/retention/communication-timeline.tsx"), /min-h-11/);
    assert.match(read("components/retention/notify-preview-dialog.tsx"), /min-h-11/);
    assert.match(read("components/retention/service-ready-panel.tsx"), /Avisar cliente/);
    assert.match(
      read("components/agenda/agenda-event-create-form.tsx"),
      /commNote/,
    );
    assert.match(
      read("lib/retention/center.ts"),
      /Cliente sem canal de comunicação disponível/,
    );
    assert.match(read("lib/retention/outbox-service.ts"), /schedule_return/);
  });
});

describe("35.2.3 retornos / appointment / service ready", () => {
  it("KPIs da central", async () => {
    const { communicationKpis } = await load("lib/retention/center.ts");
    const kpis = communicationKpis({
      rows: [
        { status: "queued" },
        { status: "sent" },
        { status: "delivered" },
        { status: "read" },
        { status: "failed" },
        { status: "suppressed" },
      ],
      clients: [
        { telefone: null, whatsapp: null, email: null },
        { telefone: "1199", email: "a@b.com" },
      ],
    });
    assert.equal(kpis.awaiting, 1);
    assert.equal(kpis.sent, 1);
    assert.equal(kpis.delivered, 1);
    assert.equal(kpis.read, 1);
    assert.equal(kpis.failed, 1);
    assert.equal(kpis.cancelled, 1);
    assert.equal(kpis.clientsWithoutWhatsApp, 1);
    assert.equal(kpis.clientsWithoutEmail, 1);
  });

  it("não inventa delivered", async () => {
    const { decideDispatch } = await load("lib/retention/channels.ts");
    assert.notEqual(
      decideDispatch({
        mode: "dry_run",
        channel: "whatsapp",
        optedIn: true,
        phone: "11999999999",
        message: "x",
      }).status,
      "delivered",
    );
    const { isConfirmedDelivery } = await load("lib/retention/pipeline.ts");
    assert.equal(isConfirmedDelivery("dry_run"), false);
    assert.equal(isConfirmedDelivery("sent"), false);
    assert.equal(isConfirmedDelivery("delivered"), true);
  });
});
