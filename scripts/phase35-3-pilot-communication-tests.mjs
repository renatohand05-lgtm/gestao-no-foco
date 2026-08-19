#!/usr/bin/env node
/**
 * Sprint 35.3 — pilot communication (test mode, allowlist, P0 events).
 * Não afirma SENT/DELIVERED real. Não ativa live nem cron.
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

const MIG = "supabase/migrations/20260919_phase35_3_pilot_communication.sql";

describe("35.3 segurança e não-regressão", () => {
  it("não ativa live, cron, billing nem envio em massa", () => {
    const env = read(".env.example");
    assert.match(env, /COMMUNICATION_MODE=test/);
    assert.doesNotMatch(env, /COMMUNICATION_MODE=live/);
    assert.match(read("app/api/cron/retention/route.ts"), /production: "DISABLED"/);
    assert.doesNotMatch(read("lib/retention/process.ts"), /sendViaChannelProvider/);
    for (const f of [
      "lib/retention/budget-notify.ts",
      "lib/retention/dispatch.ts",
      "lib/ordens/inspecao-actions.ts",
    ]) {
      assert.doesNotMatch(read(f), /asaas/i);
      assert.doesNotMatch(read(f), /stripe/i);
    }
    assert.doesNotMatch(read("lib/retention/budget-notify.ts"), /\.faturar\(/);
  });

  it("migration aditiva defaults OFF", () => {
    assert.ok(existsSync(join(root, MIG)));
    const sql = read(MIG).replace(/--.*$/gm, "");
    assert.match(sql, /send_appointment_confirmed/);
    assert.match(sql, /send_budget_published/);
    assert.match(sql, /default false/);
    assert.doesNotMatch(sql, /\bDELETE FROM\b/);
    assert.doesNotMatch(sql, /\bDROP TABLE\b/);
  });
});

describe("35.3 allowlist e modos", () => {
  it("D. fora da allowlist → blocked, zero HTTP", async () => {
    const { shouldDispatchReal, blockedProviderSendResult } = await load(
      "lib/retention/dispatch.ts",
    );
    const env = {
      COMMUNICATION_MODE: "test",
      COMMUNICATION_TEST_ALLOWLIST: "11988887777",
      WHATSAPP_ENABLED: "true",
      WHATSAPP_PROVIDER: "meta_cloud",
      WHATSAPP_ACCESS_TOKEN: "tok",
      WHATSAPP_PHONE_NUMBER_ID: "123",
    };
    assert.equal(
      shouldDispatchReal({ channel: "whatsapp", to: "11900000000", env }),
      false,
    );
    const blocked = blockedProviderSendResult({
      channel: "whatsapp",
      to: "11900000000",
      env,
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.errorCode, "blocked_by_allowlist");
    assert.match(blocked.message, /modo de teste/i);
    assert.equal(blocked.simulated, true);
    assert.equal(
      shouldDispatchReal({ channel: "whatsapp", to: "11988887777", env }),
      true,
    );
  });

  it("nunca promove test → live", async () => {
    const { resolveCommunicationMode } = await load("lib/retention/test-mode.ts");
    assert.equal(resolveCommunicationMode({}), "test");
    assert.equal(resolveCommunicationMode({ COMMUNICATION_MODE: "dry_run" }), "test");
  });
});

describe("35.3 templates e eventos P0", () => {
  it("templates curtos sem OS interna", async () => {
    const { templateFor, renderTemplate } = await load(
      "lib/retention/templates.ts",
    );
    const created = renderTemplate(templateFor({ code: "AGENDAMENTO_CRIADO" }), {
      cliente: "Ana",
      empresa: "Oficina ABC",
      data: "19/08",
      hora: "09:00",
      veiculo: "Civic · ABC1D23",
    });
    assert.match(created, /Ana/);
    assert.match(created, /foi realizado/);
    assert.doesNotMatch(created, /rascunho|mecanico_id|ordem_servico/i);
    const confirmed = renderTemplate(
      templateFor({ code: "AGENDAMENTO_CONFIRMADO" }),
      { cliente: "Ana", empresa: "Oficina ABC", data: "19/08", hora: "09:00" },
    );
    assert.match(confirmed, /está confirmado/);
    const budget = renderTemplate(templateFor({ code: "BUDGET_PUBLISHED" }), {
      cliente: "Ana",
      modelo: "Civic",
      placa: "ABC1D23",
      valor: "R$ 100,00",
      secure_link: "https://example.test/inspecao/tok",
    });
    assert.match(budget, /orçamento está disponível/i);
    assert.match(budget, /R\$ 100/);
    assert.match(budget, /inspecao\/tok/);
    assert.doesNotMatch(budget, /undefined/);
  });

  it("automações P0 independentes e default OFF", async () => {
    const { automationEventEnabled, DEFAULT_COMMUNICATION_SETTINGS } =
      await load("lib/retention/settings.ts");
    assert.equal(DEFAULT_COMMUNICATION_SETTINGS.sendAppointmentCreated, false);
    assert.equal(DEFAULT_COMMUNICATION_SETTINGS.sendAppointmentConfirmed, false);
    assert.equal(DEFAULT_COMMUNICATION_SETTINGS.sendBudgetPublished, false);
    assert.equal(DEFAULT_COMMUNICATION_SETTINGS.sendServiceReady, false);
    const off = DEFAULT_COMMUNICATION_SETTINGS;
    assert.equal(automationEventEnabled(off, "AGENDAMENTO_CRIADO"), false);
    assert.equal(automationEventEnabled(off, "BUDGET_PUBLISHED"), false);
    assert.equal(
      automationEventEnabled(
        { ...off, sendAppointmentConfirmed: true },
        "AGENDAMENTO_CONFIRMADO",
      ),
      true,
    );
    assert.equal(
      automationEventEnabled(
        { ...off, sendAppointmentConfirmed: true },
        "AGENDAMENTO_CRIADO",
      ),
      false,
    );
  });

  it("publish/confirm/ready disparam os 4 eventos", () => {
    assert.match(
      read("lib/agenda/actions.ts"),
      /templateCode: "AGENDAMENTO_CRIADO"/,
    );
    assert.match(
      read("lib/agenda/actions.ts"),
      /templateCode: "AGENDAMENTO_CONFIRMADO"/,
    );
    assert.match(
      read("lib/retention/budget-notify.ts"),
      /templateCode: "BUDGET_PUBLISHED"/,
    );
    assert.match(
      read("lib/ordens/inspecao-actions.ts"),
      /enqueueBudgetPublishedAfterPublish/,
    );
    assert.match(
      read("lib/retention/actions.ts"),
      /templateCode: "SERVICE_READY"/,
    );
    assert.match(
      read("lib/retention/actions.ts"),
      /marcarAguardandoRetirada/,
    );
    const finalize = read("lib/retention/actions.ts");
    assert.doesNotMatch(
      finalize.slice(
        finalize.indexOf("export async function finalizeServiceReadyAction"),
        finalize.indexOf("export async function registerOsPickupAction"),
      ),
      /["']entregue["']/,
    );
  });
});

describe("35.3 retry, isolamento, UX", () => {
  it("H/I retry FAILED sim; DELIVERED não", async () => {
    const { canManualResend } = await load("lib/retention/resend.ts");
    assert.equal(
      canManualResend({
        actorTenantId: "t",
        rowTenantId: "t",
        status: "failed",
        optedIn: true,
        hasDestination: true,
      }).ok,
      true,
    );
    assert.equal(
      canManualResend({
        actorTenantId: "t",
        rowTenantId: "t",
        status: "delivered",
        optedIn: true,
        hasDestination: true,
      }).ok,
      false,
    );
    assert.match(read("lib/retention/outbox-service.ts"), /retryDispatch/);
    assert.match(read("lib/retention/actions.ts"), /retryDispatch/);
  });

  it("J tenant isolation", async () => {
    const { filterCenterRows } = await load("lib/retention/center.ts");
    const onlyA = filterCenterRows(
      [
        { tenant_id: "a", channel: "whatsapp", status: "sent" },
        { tenant_id: "b", channel: "whatsapp", status: "sent" },
      ],
      { tenantId: "a" },
    );
    assert.equal(onlyA.length, 1);
    assert.match(read("lib/retention/outbox-service.ts"), /\.eq\("tenant_id"/);
    assert.match(read("lib/retention/webhook.ts"), /tenant_id/);
  });

  it("F/E canal do cliente ≠ provider", async () => {
    const { formatCustomerChannelAvailability } = await load(
      "lib/retention/comm-note.ts",
    );
    const line = formatCustomerChannelAvailability({
      whatsappAvailable: true,
      emailAvailable: false,
      whatsappProviderConfigured: false,
      emailProviderConfigured: false,
    });
    assert.match(line, /disponível/);
    assert.match(line, /provider não configurado/);
    assert.doesNotMatch(line, /Cliente sem canal disponível/);
    const none = formatCustomerChannelAvailability({
      whatsappAvailable: false,
      emailAvailable: false,
    });
    assert.match(none, /sem canal/i);
    assert.match(read("components/ordens/os-workspace.tsx"), /Canal do cliente/);
    assert.match(read("components/ordens/os-workspace.tsx"), /Status do provider/);
  });

  it("histórico e retry na OS", () => {
    assert.match(read("components/ordens/os-workspace.tsx"), /Comunicações/);
    assert.match(
      read("components/retention/communication-timeline.tsx"),
      /Tentar novamente/,
    );
    assert.match(
      read("app/(app)/[tenant]/ordens/[id]/page.tsx"),
      /listByEntity\("os"/,
    );
  });

  it("histórico operador", async () => {
    const { communicationHistoryLine } = await load(
      "lib/retention/history-display.ts",
    );
    assert.match(
      communicationHistoryLine({
        status: "sent",
        channel: "whatsapp",
        template_code: "SERVICE_READY",
      }),
      /✓ WhatsApp — Serviço pronto — Enviado/,
    );
    assert.match(
      communicationHistoryLine({
        status: "blocked",
        channel: "email",
        template_code: "AGENDAMENTO_CRIADO",
        error_code: "blocked_by_allowlist",
      }),
      /○ E-mail — Agendamento criado — Bloqueado pelo modo de teste/,
    );
  });
});
