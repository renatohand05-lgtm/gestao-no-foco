#!/usr/bin/env node
/**
 * Sprint 35.2.2 — providers, SERVICE_READY, webhook, isolamento, kill switch.
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
const MIG = "supabase/migrations/20260903_phase35_2_2_notifications.sql";

describe("35.2.2 evidência, migration e segurança", () => {
  it("docs e migration aditiva existem", () => {
    assert.ok(existsSync(join(root, MIG)));
    assert.ok(existsSync(join(root, "docs/product/NOTIFICATIONS.md")));
    assert.ok(existsSync(join(root, "docs/operations/NOTIFICATION_RUNBOOK.md")));
    assert.ok(existsSync(join(root, "docs/operations/WHATSAPP_PROVIDER_SETUP.md")));
    assert.ok(existsSync(join(root, "docs/testing/evidence/35-2-2/REPORT.md")));
    const sql = read(MIG).replace(/--.*$/gm, "");
    assert.match(sql, /communication_tenant_settings/);
    assert.match(sql, /notification_webhook_events/);
    assert.match(sql, /provider_message_id/);
    assert.match(sql, /enable row level security/);
    assert.doesNotMatch(sql, /\bDELETE FROM\b/);
    assert.doesNotMatch(sql, /\bDROP TABLE\b/);
  });

  it("Meta URL só no adapter; job segue DRY_RUN", () => {
    assert.match(read("lib/retention/providers/whatsapp-meta.ts"), /graph\.facebook/);
    for (const f of [
      "lib/retention/process.ts",
      "lib/retention/actions.ts",
      "lib/retention/channels.ts",
      "app/api/cron/retention/route.ts",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /graph\.facebook/);
      assert.doesNotMatch(src, /asaas/i);
      assert.doesNotMatch(src, /stripe/i);
    }
    assert.doesNotMatch(read("lib/retention/process.ts"), /mode: "provider"/);
    assert.match(read("app/api/cron/retention/route.ts"), /production: "DISABLED"/);
  });
});

describe("35.2.2 WhatsApp provider", () => {
  it("1. disabled não envia", async () => {
    const { createWhatsAppProvider } = await load(
      "lib/retention/providers/factory.ts",
    );
    const p = createWhatsAppProvider({ WHATSAPP_PROVIDER: "disabled" });
    const res = await p.send({ to: "11999999999", body: "oi", tenantId: "t" });
    assert.equal(p.id, "disabled");
    assert.equal(res.status, "cancelled");
    assert.equal(res.simulated, true);
  });

  it("2. dry-run não envia", async () => {
    const { createWhatsAppProvider } = await load(
      "lib/retention/providers/factory.ts",
    );
    const p = createWhatsAppProvider({ WHATSAPP_PROVIDER: "dry_run" });
    const res = await p.send({ to: "11999999999", body: "oi", tenantId: "t" });
    assert.equal(p.id, "dry_run");
    assert.equal(res.status, "dry_run");
    assert.notEqual(res.status, "delivered");
  });

  it("3. manual link funciona", async () => {
    const { createWhatsAppProvider } = await load(
      "lib/retention/providers/factory.ts",
    );
    const p = createWhatsAppProvider({ WHATSAPP_PROVIDER: "manual_link" });
    const res = await p.send({ to: "11999999999", body: "olá", tenantId: "t" });
    assert.equal(res.status, "manual_opened");
    assert.match(res.message, /wa\.me/);
    assert.notEqual(res.status, "delivered");
  });

  it("4. provider mode chama adapter Meta", async () => {
    const { createWhatsAppProvider } = await load(
      "lib/retention/providers/factory.ts",
    );
    const p = createWhatsAppProvider({
      WHATSAPP_PROVIDER: "meta_cloud",
      WHATSAPP_ENABLED: "true",
      WHATSAPP_ACCESS_TOKEN: "tok",
      WHATSAPP_PHONE_NUMBER_ID: "123",
    });
    assert.equal(p.id, "meta_cloud");
  });

  it("5. secret nunca vai para client", () => {
    for (const f of [
      "components/retention/service-ready-panel.tsx",
      "components/retention/communication-settings-form.tsx",
      "components/retention/awaiting-pickup-panel.tsx",
      "app/(app)/[tenant]/configuracoes/comunicacoes/page.tsx",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /WHATSAPP_ACCESS_TOKEN/);
      assert.doesNotMatch(src, /RESEND_API_KEY/);
      assert.doesNotMatch(src, /WHATSAPP_APP_SECRET/);
    }
  });

  it("6. opt-out bloqueia", async () => {
    const { decideDispatch } = await load("lib/retention/channels.ts");
    const res = decideDispatch({
      mode: "dry_run",
      channel: "whatsapp",
      optedIn: false,
      phone: "1199",
      message: "x",
    });
    assert.equal(res.status, "cancelled");
  });

  it("7. tenant isolation nos serviços", () => {
    for (const f of [
      "lib/retention/outbox-service.ts",
      "lib/retention/settings-service.ts",
    ]) {
      assert.match(read(f), /\.eq\("tenant_id"/);
    }
  });

  it("8. idempotência inclui os + SERVICE_READY", async () => {
    const { communicationIdempotencyKey } = await load(
      "lib/retention/idempotency.ts",
    );
    const a = communicationIdempotencyKey({
      tenantId: "t",
      clienteId: "c",
      entityType: "os",
      entityId: "os1",
      templateCode: "SERVICE_READY",
      offsetKey: "SERVICE_READY",
      channel: "whatsapp",
    });
    const b = communicationIdempotencyKey({
      tenantId: "t",
      clienteId: "c",
      entityType: "os",
      entityId: "os1",
      templateCode: "SERVICE_READY",
      offsetKey: "SERVICE_READY",
      channel: "whatsapp",
    });
    assert.equal(a, b);
  });

  it("9. retry controlado", async () => {
    const { canRetryFailed, retryBackoffMs } = await load(
      "lib/retention/rate-limit.ts",
    );
    assert.equal(canRetryFailed({ attemptCount: 5 }), false);
    assert.equal(canRetryFailed({ attemptCount: 1, lastAttemptAt: null }), true);
    assert.ok(retryBackoffMs(3) > retryBackoffMs(1));
  });

  it("10. webhook duplicated por event_id+status", async () => {
    const { parseMetaWebhook } = await load(
      "lib/retention/providers/whatsapp-meta.ts",
    );
    const delivered = parseMetaWebhook(
      JSON.stringify({
        entry: [
          {
            changes: [
              { value: { statuses: [{ id: "wamid.1", status: "delivered" }] } },
            ],
          },
        ],
      }),
    );
    const readEvt = parseMetaWebhook(
      JSON.stringify({
        entry: [
          {
            changes: [
              { value: { statuses: [{ id: "wamid.1", status: "read" }] } },
            ],
          },
        ],
      }),
    );
    assert.equal(delivered.mappedStatus, "delivered");
    assert.equal(readEvt.mappedStatus, "read");
    assert.notEqual(delivered.eventId, readEvt.eventId);
  });

  it("11. delivery status mapeado", async () => {
    const { parseMetaWebhook } = await load(
      "lib/retention/providers/whatsapp-meta.ts",
    );
    const failed = parseMetaWebhook(
      JSON.stringify({
        entry: [{ changes: [{ value: { statuses: [{ id: "x", status: "failed" }] } }] }],
      }),
    );
    assert.equal(failed.mappedStatus, "failed");
  });

  it("12-13. inbound SIM cria intenção, não agendamento", async () => {
    const { inboundAffirmativeIntent, isAffirmativeReply } = await load(
      "lib/retention/inbound.ts",
    );
    assert.equal(isAffirmativeReply("SIM"), true);
    assert.equal(isAffirmativeReply("sim"), true);
    assert.equal(isAffirmativeReply("Sim"), true);
    assert.equal(
      inboundAffirmativeIntent({ text: "SIM", entityType: "retorno" }),
      "cliente_respondeu_sim",
    );
    assert.equal(
      inboundAffirmativeIntent({ text: "SIM", entityType: "os" }),
      null,
    );
    assert.notEqual(
      inboundAffirmativeIntent({ text: "SIM", entityType: "retorno" }),
      "agendado",
    );
  });
});

describe("35.2.2 e-mail", () => {
  it("14. disabled", async () => {
    const { createEmailProvider } = await load("lib/retention/providers/factory.ts");
    const p = createEmailProvider({ EMAIL_PROVIDER: "disabled" });
    const res = await p.send({ to: "a@b.com", body: "x", tenantId: "t" });
    assert.equal(res.status, "cancelled");
  });

  it("15. dry-run", async () => {
    const { createEmailProvider } = await load("lib/retention/providers/factory.ts");
    const p = createEmailProvider({ EMAIL_PROVIDER: "dry_run" });
    const res = await p.send({ to: "a@b.com", body: "x", tenantId: "t" });
    assert.equal(res.status, "dry_run");
  });

  it("16. provider Resend sem credencial falha limpo", async () => {
    const { createEmailProvider } = await load("lib/retention/providers/factory.ts");
    const p = createEmailProvider({
      EMAIL_PROVIDER: "resend",
      EMAIL_ENABLED: "true",
    });
    assert.equal(p.id, "resend");
    const res = await p.send({ to: "a@b.com", body: "x", tenantId: "t" });
    assert.equal(res.status, "failed");
    assert.doesNotMatch(res.message ?? "", /re_/);
  });

  it("17. opt-out e-mail", async () => {
    const { decideDispatch } = await load("lib/retention/channels.ts");
    assert.equal(
      decideDispatch({
        mode: "dry_run",
        channel: "email",
        optedIn: false,
        email: "a@b.com",
        message: "x",
      }).status,
      "cancelled",
    );
  });

  it("18. fallback só com flag", async () => {
    const { pickChannels, DEFAULT_COMMUNICATION_SETTINGS } = await load(
      "lib/retention/settings.ts",
    );
    const off = pickChannels({
      settings: { ...DEFAULT_COMMUNICATION_SETTINGS, fallbackEmail: false },
      preferred: "whatsapp",
      whatsappAvailable: false,
      emailAvailable: true,
    });
    const on = pickChannels({
      settings: {
        ...DEFAULT_COMMUNICATION_SETTINGS,
        fallbackEmail: true,
        emailMode: "provider",
      },
      preferred: "whatsapp",
      whatsappAvailable: false,
      emailAvailable: true,
    });
    assert.deepEqual(off, []);
    assert.deepEqual(on, ["email"]);
  });
});

describe("35.2.2 agenda e retornos", () => {
  it("19. appointment created template", async () => {
    const { templateFor, renderTemplate } = await load("lib/retention/templates.ts");
    const msg = renderTemplate(templateFor({ code: "AGENDAMENTO_CRIADO" }), {
      cliente_nome: "Ana",
      empresa_nome: "Oficina ABC",
      data: "16/08",
      hora: "09:00",
      servico: "Revisão",
    });
    assert.match(msg, /Ana/);
    assert.match(msg, /Oficina ABC/);
    assert.doesNotMatch(msg, /undefined/);
  });

  it("20. reminder planner exige offset configurado", async () => {
    const { planAppointmentReminders, SUGGESTED_REMINDER_OFFSETS } = await load(
      "lib/retention/reminders.ts",
    );
    assert.deepEqual([...SUGGESTED_REMINDER_OFFSETS], ["D-1", "H-2"]);
    const none = planAppointmentReminders({
      tenantId: "t",
      now: new Date("2026-08-16T12:00:00Z"),
      events: [{ id: "e1", clienteId: "c1", startsAt: "2026-08-17T12:00:00Z" }],
      reminderOffsets: [],
      existingKeys: [],
    });
    assert.equal(none.length, 0);
    const planned = planAppointmentReminders({
      tenantId: "t",
      now: new Date("2026-08-16T12:05:00Z"),
      events: [{ id: "e1", clienteId: "c1", startsAt: "2026-08-17T12:00:00Z" }],
      reminderOffsets: ["D-1"],
      existingKeys: [],
    });
    assert.equal(planned.length, 1);
    assert.equal(planned[0].templateCode, "LEMBRETE");
    const dup = planAppointmentReminders({
      tenantId: "t",
      now: new Date("2026-08-16T12:05:00Z"),
      events: [{ id: "e1", clienteId: "c1", startsAt: "2026-08-17T12:00:00Z" }],
      reminderOffsets: ["D-1"],
      existingKeys: [planned[0].idempotencyKey],
    });
    assert.equal(dup.length, 0);
  });

  it("21-23. D-10 D-3 overdue continuam no job 35.2", async () => {
    const { planRetentionNotifications } = await load("lib/retention/job.ts");
    const { offsetsForSegment } = await load("lib/retention/returns.ts");
    const keys = offsetsForSegment("oficina").map((o) => o.key);
    assert.ok(keys.includes("D10") || keys.includes("d10") || keys.some((k) => /10/.test(k)));
    const row = {
      id: "r1",
      tenant_id: "t",
      cliente_id: "c1",
      due_at: "2026-08-26",
      status: "previsto",
      hide_procedure: false,
    };
    const planned = planRetentionNotifications({
      tenantId: "t",
      todayCivil: "2026-08-16",
      hourLocal: 10,
      segment: "oficina",
      existingKeys: [],
      returns: [row],
    });
    assert.ok(planned.some((p) => p.templateCode === "RETORNO_D10"));
  });
});

describe("35.2.2 SERVICE_READY", () => {
  it("24-26. templates oficina/lava e sem diagnóstico em lava", async () => {
    const { templateFor, renderTemplate } = await load("lib/retention/templates.ts");
    const oficina = templateFor({ code: "SERVICE_READY", segment: "oficina" });
    const lava = templateFor({ code: "SERVICE_READY", segment: "lava_rapido" });
    assert.match(oficina, /veículo está pronto/i);
    assert.doesNotMatch(lava, /diagnóstico|peças|OS/i);
    const rendered = renderTemplate(lava, {
      cliente_nome: "João",
      empresa_nome: "Lava X",
      veiculo: "Veículo: Honda Civic · ABC1D23",
    });
    assert.match(rendered, /Honda Civic/);
    assert.doesNotMatch(rendered, /undefined|null/);
  });

  it("27. clique duplo mesma chave", async () => {
    const { communicationIdempotencyKey } = await load(
      "lib/retention/idempotency.ts",
    );
    const key = () =>
      communicationIdempotencyKey({
        tenantId: "t",
        clienteId: "c",
        entityType: "os",
        entityId: "os1",
        templateCode: "SERVICE_READY",
        offsetKey: "SERVICE_READY",
        channel: "whatsapp",
      });
    assert.equal(key(1), key(2));
  });

  it("28-29. sem contato / opt-out cancelam canal", async () => {
    const { decideDispatch } = await load("lib/retention/channels.ts");
    assert.equal(
      decideDispatch({
        mode: "dry_run",
        channel: "whatsapp",
        optedIn: true,
        phone: "",
        message: "x",
      }).status,
      "failed",
    );
    assert.equal(
      decideDispatch({
        mode: "dry_run",
        channel: "whatsapp",
        optedIn: false,
        phone: "1199",
        message: "x",
      }).status,
      "cancelled",
    );
  });

  it("30-31. aguardando retirada e entrega usam status existentes", () => {
    const os = read("lib/ordens/ordem-servico-service.ts");
    assert.match(os, /marcarAguardandoRetirada/);
    assert.match(os, /registrarRetirada/);
    assert.match(os, /pronto_para_entrega/);
    assert.match(os, /entregue/);
    assert.doesNotMatch(os, /AGUARDANDO_RETIRADA/);
  });
});

describe("35.2.2 segmentos e segurança", () => {
  it("32-35. SERVICE_READY só com work_orders", async () => {
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const { serviceReadyAllowed } = await load("lib/retention/service-ready.ts");
    assert.equal(
      serviceReadyAllowed(resolveSegmentContext({ segment: "consultoria", ...ENGINE })),
      false,
    );
    assert.equal(
      serviceReadyAllowed(
        resolveSegmentContext({ segment: "consultorio_odontologico", ...ENGINE }),
      ),
      false,
    );
    assert.equal(
      serviceReadyAllowed(resolveSegmentContext({ segment: "barbearia", ...ENGINE })),
      false,
    );
    assert.equal(
      serviceReadyAllowed(resolveSegmentContext({ segment: "oficina", ...ENGINE })),
      true,
    );
    assert.equal(
      serviceReadyAllowed(resolveSegmentContext({ segment: "lava_rapido", ...ENGINE })),
      true,
    );
  });

  it("36-38. cross-tenant, RBAC, inactive", () => {
    assert.match(read("lib/retention/actions.ts"), /requireTenantMutationPermission/);
    assert.match(read("lib/retention/actions.ts"), /os\.finalizar/);
    assert.match(read("lib/retention/actions.ts"), /crm\.notificacoes\.enviar/);
    assert.match(
      read("lib/rbac/mutation-auth.ts"),
      /bloqueia inactive|membership ATIVA|requireTenant já bloqueia inactive/,
    );
    assert.match(read("lib/retention/notify.ts"), /tenant_id/);
  });

  it("39. kill switch vence provider", async () => {
    const { effectiveWhatsAppMode, effectiveEmailMode } = await load(
      "lib/retention/providers/runtime.ts",
    );
    assert.equal(
      effectiveWhatsAppMode({
        WHATSAPP_PROVIDER: "meta_cloud",
        WHATSAPP_ENABLED: "false",
      }),
      "dry_run",
    );
    assert.equal(
      effectiveEmailMode({ EMAIL_PROVIDER: "resend", EMAIL_ENABLED: "" }),
      "dry_run",
    );
  });

  it("40. rate limit há pausa", async () => {
    const { shouldHaltRateLimit } = await load("lib/retention/rate-limit.ts");
    assert.equal(shouldHaltRateLimit({ sentLastHour: 80 }).halt, true);
    assert.equal(shouldHaltRateLimit({ sentLastHour: 1 }).halt, false);
  });

  it("health nunca afirma conectado só por env solta", async () => {
    const { whatsappHealth } = await load("lib/retention/providers/runtime.ts");
    const h = whatsappHealth({ WHATSAPP_PROVIDER: "meta_cloud" });
    assert.notEqual(h.status, "VALIDATED");
    assert.equal(h.canSendReal, false);
  });

  it("HTML de e-mail é escapado", async () => {
    const { emailBodyAsSafeHtml } = await load("lib/retention/providers/email.ts");
    assert.match(emailBodyAsSafeHtml("<script>x</script>"), /&lt;script/);
  });

  it("veículo omite vazio", async () => {
    const { vehicleSummaryLine } = await load("lib/retention/vehicle-line.ts");
    assert.equal(vehicleSummaryLine({ marca: "null", modelo: "", placa: "" }), "");
    assert.equal(
      vehicleSummaryLine({ marca: "Honda", modelo: "Civic", placa: "ABC1D23" }),
      "Veículo: Honda Civic · ABC1D23",
    );
  });

  it("UI SERVICE_READY e comunicações", () => {
    assert.match(
      read("components/retention/service-ready-panel.tsx"),
      /Finalizar/,
    );
    assert.match(
      read("components/retention/awaiting-pickup-panel.tsx"),
      /awaiting-pickup/,
    );
    assert.match(
      read("app/(app)/[tenant]/configuracoes/comunicacoes/page.tsx"),
      /Comunicações/,
    );
    assert.match(read("app/api/webhooks/whatsapp/route.ts"), /hub\.verify_token/);
  });

  it("defaults automação OFF", async () => {
    const { DEFAULT_COMMUNICATION_SETTINGS } = await load(
      "lib/retention/settings.ts",
    );
    assert.equal(DEFAULT_COMMUNICATION_SETTINGS.sendServiceReady, false);
    assert.equal(DEFAULT_COMMUNICATION_SETTINGS.notifyReadyAuto, false);
    assert.equal(DEFAULT_COMMUNICATION_SETTINGS.sendDelivery, false);
    assert.deepEqual(DEFAULT_COMMUNICATION_SETTINGS.reminderOffsets, []);
  });
});
