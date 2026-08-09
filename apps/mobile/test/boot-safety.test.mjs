import test from "node:test";
import assert from "node:assert/strict";

import { normalizePublicUrl } from "../src/env/urls.ts";
import { resolveBootRoute } from "../src/auth/guards.ts";
import {
  classifyRestoreFailure,
  messageForAuthFailure,
} from "../src/auth/recovery-policy.ts";

test("boot sem sessão → rota login", () => {
  assert.equal(resolveBootRoute("unauthenticated"), "/(auth)/login");
});

test("boot com sessão válida (authenticated) → home", () => {
  assert.equal(resolveBootRoute("authenticated"), "/(app)");
});

test("boot com sessão inválida (revoked/expired) → login", () => {
  assert.equal(resolveBootRoute("revoked"), "/(auth)/login");
  assert.equal(resolveBootRoute("expired"), "/(auth)/login");
});

test("offlineLimited → /offline; após reset → login", () => {
  assert.equal(resolveBootRoute("offline_limited"), "/offline");
  assert.equal(resolveBootRoute("unauthenticated"), "/(auth)/login");
});

test("fatal/error → login (guard) para recovery UI no index", () => {
  assert.equal(resolveBootRoute("error"), "/(auth)/login");
});

test("refresh inválido online não é rede", () => {
  const kind = classifyRestoreFailure({
    network: "online",
    refreshOk: false,
    hasSessionAfterRefresh: false,
  });
  assert.equal(kind, "local_credential_invalid");
  assert.equal(/internet/i.test(messageForAuthFailure(kind)), false);
});

test("normalizePublicUrl remove /rest/v1 e barra final", () => {
  assert.equal(
    normalizePublicUrl("https://example.supabase.co/rest/v1/"),
    "https://example.supabase.co",
  );
  assert.equal(
    normalizePublicUrl("https://api.example.com/"),
    "https://api.example.com",
  );
});

test("Face ID falha classificada sem crash message de rede", () => {
  assert.equal(
    /internet/i.test(messageForAuthFailure("biometric_failed")),
    false,
  );
});
