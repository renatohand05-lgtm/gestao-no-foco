#!/usr/bin/env node
/**
 * HOTFIX — Oficina notify parity with Lava (same ServiceReadyPanel).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

describe("oficina notify parity — visibilidade", () => {
  it("A/B painel na execução; provider OFF não esconde", async () => {
    const { canShowServiceReadyPanel } = await load(
      "lib/retention/service-ready.ts",
    );
    const open = {
      workOrdersEnabled: true,
      canFinalize: true,
      osStatus: "em_execucao",
    };
    assert.equal(canShowServiceReadyPanel(open), true);
    assert.equal(
      canShowServiceReadyPanel({ ...open, osStatus: "aprovado" }),
      true,
    );
    assert.equal(
      canShowServiceReadyPanel({ ...open, osStatus: "entregue" }),
      false,
    );
    assert.equal(
      canShowServiceReadyPanel({ ...open, osStatus: "faturado" }),
      false,
    );
    assert.equal(
      canShowServiceReadyPanel({ ...open, osStatus: "cancelado" }),
      false,
    );
    const ws = read("components/ordens/os-workspace.tsx");
    assert.match(ws, /tab === "execucao"/);
    assert.match(ws, /serviceReadyPanel/);
    const gate = read("lib/retention/service-ready.ts");
    const visibility = gate.slice(
      gate.indexOf("export function canShowServiceReadyPanel"),
      gate.indexOf("export function formatServiceReadyFinalizeNote"),
    );
    assert.doesNotMatch(visibility, /whatsappProvider|EMAIL_ENABLED|canSendReal/);
    assert.doesNotMatch(ws, /if \(segment ===/);
  });

  it("canais vs provider no mesmo painel do Lava", () => {
    const panel = read("components/retention/service-ready-panel.tsx");
    assert.match(panel, /Canal do cliente/);
    assert.match(panel, /Status do provider/);
    assert.match(panel, /WhatsApp cadastrado/);
    assert.match(panel, /não configurado/);
    assert.match(panel, /Finalizar e avisar cliente|finalizeAndNotifyLabel/);
    assert.match(read("components/ordens/os-workspace.tsx"), /Finalizar serviço/);
    assert.match(read("components/ordens/os-workspace.tsx"), /Finalizar e avisar cliente/);
    assert.doesNotMatch(panel, /canSendReal && !hasWhatsapp/);
    const src = panel.slice(0, panel.indexOf("if (!enabled"));
    assert.doesNotMatch(src, /whatsappProviderConfigured\) return null/);
  });
});

describe("oficina notify parity — finalize", () => {
  it("C-E finalizar não entrega; provider OFF tem fallback", async () => {
    const { formatServiceReadyFinalizeNote } = await load(
      "lib/retention/service-ready.ts",
    );
    assert.equal(
      formatServiceReadyFinalizeNote({
        notify: false,
        requested: [],
        whatsappProviderConfigured: false,
        emailProviderConfigured: false,
      }),
      "Finalizado sem notificar o cliente.",
    );
    assert.match(
      formatServiceReadyFinalizeNote({
        notify: true,
        requested: ["whatsapp", "email"],
        whatsappProviderConfigured: false,
        emailProviderConfigured: false,
      }),
      /WhatsApp não configurado/,
    );
    assert.match(
      formatServiceReadyFinalizeNote({
        notify: true,
        requested: ["whatsapp", "email"],
        whatsappProviderConfigured: false,
        emailProviderConfigured: false,
      }),
      /E-mail não configurado/,
    );
    const fin = read("lib/retention/actions.ts");
    const slice = fin.slice(
      fin.indexOf("finalizeServiceReadyAction"),
      fin.indexOf("registerOsPickupAction"),
    );
    assert.match(slice, /marcarAguardandoRetirada/);
    assert.match(slice, /formatServiceReadyFinalizeNote/);
    assert.match(slice, /status = "pronto_para_entrega"/);
    assert.doesNotMatch(slice, /status: "entregue"/);
    assert.match(slice, /templateCode: "SERVICE_READY"/);
    assert.match(slice, /offsetKey: "SERVICE_READY"/);
    assert.match(slice, /explicit: true/);
  });

  it("G idempotência SERVICE_READY; template oficina", async () => {
    const { communicationIdempotencyKey } = await load(
      "lib/retention/idempotency.ts",
    );
    const key = {
      tenantId: "t",
      clienteId: "c",
      entityType: "os",
      entityId: "os1",
      templateCode: "SERVICE_READY",
      offsetKey: "SERVICE_READY",
      channel: "whatsapp",
    };
    assert.equal(
      communicationIdempotencyKey(key),
      communicationIdempotencyKey(key),
    );
    const { templateFor, renderTemplate } = await load(
      "lib/retention/templates.ts",
    );
    const oficina = renderTemplate(
      templateFor({ code: "SERVICE_READY", segment: "oficina" }),
      { cliente: "Ana", empresa: "Oficina X", modelo: "Civic", placa: "ABC1D23" },
    );
    assert.match(oficina, /veículo está pronto/i);
    assert.match(oficina, /Civic/);
    assert.match(oficina, /ABC1D23/);
    assert.doesNotMatch(oficina, /entregue/i);
    const lava = templateFor({ code: "SERVICE_READY", segment: "lava_rapido" });
    assert.match(lava, /pronto para retirada/i);
  });
});

describe("guards", () => {
  it("não ativa live, cron, billing nem 35.4", () => {
    for (const f of [
      "lib/retention/service-ready.ts",
      "components/retention/service-ready-panel.tsx",
      "components/ordens/os-workspace.tsx",
      "lib/retention/actions.ts",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /COMMUNICATION_MODE\s*=\s*["']live["']/);
      assert.doesNotMatch(src, /asaas/i);
      assert.doesNotMatch(src, /stripe/i);
      assert.doesNotMatch(src, /35\.4/);
    }
  });
});
