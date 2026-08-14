#!/usr/bin/env node
/**
 * Sprint 34.6 — Observabilidade operacional + runbooks + health seguro.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("34.6 logger sanitization", () => {
  it("redige secrets e valores JWT/Bearer", async () => {
    const { sanitizeContext } = await import(
      pathToFileURL(join(root, "lib/observability/logger.ts")).href +
        `?t=${Date.now()}`
    );
    const cleaned = sanitizeContext({
      password: "secret",
      access_token: "tok",
      authorization: "Bearer abc",
      nested: { api_key: "k", ok: true },
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb",
      safe: "hello",
    });
    assert.equal(cleaned.password, "[redacted]");
    assert.equal(cleaned.access_token, "[redacted]");
    assert.equal(cleaned.authorization, "[redacted]");
    assert.equal(cleaned.nested.api_key, "[redacted]");
    assert.equal(cleaned.nested.ok, true);
    assert.equal(cleaned.jwt, "[redacted]");
    assert.equal(cleaned.safe, "hello");
  });
});

describe("34.6 request id + health", () => {
  it("request-id helper e rotas health/status com header", () => {
    assert.ok(existsSync(join(root, "lib/observability/request-id.ts")));
    const health = read("app/api/health/route.ts");
    const status = read("app/api/status/route.ts");
    assert.match(health, /resolveRequestId/);
    assert.match(health, /x-request-id|REQUEST_ID_HEADER/);
    assert.match(status, /resolveRequestId/);
    assert.ok(!status.includes("process.version"));
    const mw = read("lib/supabase/middleware.ts");
    assert.match(mw, /isOperationalApi[\s\S]*x-request-id/);
  });

  it("health não expõe secrets e marca billing frozen", async () => {
    const healthMod = await import(
      pathToFileURL(join(root, "lib/platform/health.ts")).href + `?t=${Date.now()}`
    );
    const status = await healthMod.buildSystemStatus(false);
    assert.equal(status.billing.frozen, true);
    assert.equal(status.billing.realChargesAuthorized, false);
    assert.ok(!("node" in status));
    const json = JSON.stringify(status);
    assert.ok(!/service_role|eyJ|sk_live/i.test(json));
    assert.ok(status.checks.env);
    assert.ok(status.checks.supabase);
    assert.ok(status.checks.serviceRole);
  });
});

describe("34.6 error mapping", () => {
  it("mapeia PGRST/failed to fetch/RLS para mensagem de negócio", async () => {
    const { mapDatabaseErrorToUserMessage } = await import(
      pathToFileURL(join(root, "lib/supabase/friendly-error.ts")).href +
        `?t=${Date.now()}`
    );
    assert.match(
      mapDatabaseErrorToUserMessage(new Error("Failed to fetch")),
      /comunicação|conexão/i,
    );
    assert.match(
      mapDatabaseErrorToUserMessage(new Error("PGRST116")),
      /não encontrado|permissão/i,
    );
    assert.match(
      mapDatabaseErrorToUserMessage(new Error("row-level security policy")),
      /permissão/i,
    );
    assert.ok(
      !mapDatabaseErrorToUserMessage(new Error("PGRST116")).includes("PGRST"),
    );
  });

  it("auth redirect não usa console.error cru", () => {
    const auth = read("lib/auth/actions.ts");
    assert.match(auth, /logger\.exception/);
    assert.ok(!auth.includes("console.error"));
  });
});

describe("34.6 runbooks", () => {
  it("documentos operacionais presentes", () => {
    for (const f of [
      "docs/operations/README.md",
      "docs/operations/INCIDENT_RUNBOOK.md",
      "docs/operations/RECOVERY_RUNBOOK.md",
      "docs/operations/SUPPORT_RUNBOOK.md",
      "docs/operations/MIGRATION_CHECKLIST.md",
      "docs/operations/DEPLOY_READINESS.md",
      "docs/testing/evidence/34-6/REPORT.md",
    ]) {
      assert.ok(existsSync(join(root, f)), f);
    }
    const recovery = read("docs/operations/RECOVERY_RUNBOOK.md");
    assert.match(recovery, /NOT ENABLED|NÃO HABILITADO/i);
    assert.match(recovery, /Backup diário/);
    const incident = read("docs/operations/INCIDENT_RUNBOOK.md");
    assert.match(incident, /SEV1/);
    assert.match(incident, /Detectar/);
  });
});

describe("34.6 billing freeze", () => {
  it("billing frozen", async () => {
    const prev = { ...process.env };
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_ENV;
    try {
      const config = await import(
        pathToFileURL(join(root, "lib/billing/config.ts")).href + `?t=${Date.now()}`
      );
      const blockers = await import(
        pathToFileURL(join(root, "lib/billing/external-blockers.ts")).href +
          `?t=${Date.now()}`
      );
      assert.equal(config.getAsaasEnvMode(), "sandbox");
      assert.equal(config.isRealChargesAuthorized(), false);
      assert.equal(blockers.isAsaasProductionApiKeyBlockedExternally(), true);
    } finally {
      for (const k of Object.keys(process.env)) {
        if (!(k in prev)) delete process.env[k];
      }
      Object.assign(process.env, prev);
    }
  });
});
