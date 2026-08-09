/**
 * Sprint 32.2 — checks estáticos telemetria + taxonomia (sem import Expo nativo).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("32.2 telemetry + error taxonomy", () => {
  it("define eventos canônicos no módulo telemetry", () => {
    const src = readFileSync(
      join(mobileRoot, "src/observability/telemetry.ts"),
      "utf8",
    );
    assert.match(src, /APP_STARTED/);
    assert.match(src, /API_FAILED/);
    assert.match(src, /trackTelemetry/);
  });

  it("taxonomia mapeia API → UX", () => {
    const src = readFileSync(join(mobileRoot, "src/errors/taxonomy.ts"), "utf8");
    assert.match(src, /SESSION_EXPIRED/);
    assert.match(src, /PERMISSION_DENIED/);
    assert.match(src, /Sua sessão expirou/);
    assert.match(src, /Verifique sua internet/);
    assert.match(src, /categoryFromApiError/);
  });

  it("layout emite APP_STARTED / APP_READY", () => {
    const src = readFileSync(join(mobileRoot, "app/_layout.tsx"), "utf8");
    assert.match(src, /APP_STARTED/);
    assert.match(src, /APP_READY/);
  });
});
