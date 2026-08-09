import test from "node:test";
import assert from "node:assert/strict";

import {
  OFFICIAL_MOBILE_API_ORIGIN,
  resolveMobileApiBaseUrl,
  isSupabaseHost,
} from "../src/env/api-base.ts";
import {
  classifyMembershipError,
  messageForPostLoginCode,
} from "../src/auth/post-login-errors.ts";
import { resolveBootRoute } from "../src/auth/guards.ts";

test("API base Supabase usada para /api/mobile/v1 → validação falha e corrige", () => {
  const res = resolveMobileApiBaseUrl({
    apiBase: "https://phjskpyuqlijvbgjdkss.supabase.co",
    supabaseUrl: "https://phjskpyuqlijvbgjdkss.supabase.co",
  });
  assert.equal(res.code, "API_BASE_IS_SUPABASE");
  assert.equal(res.corrected, true);
  assert.equal(res.url, OFFICIAL_MOBILE_API_ORIGIN);
  assert.equal(isSupabaseHost(res.url), false);
});

test("API base Vercel → requisição correta (OK)", () => {
  const res = resolveMobileApiBaseUrl({
    apiBase: "https://gestao-no-foco.vercel.app",
    supabaseUrl: "https://phjskpyuqlijvbgjdkss.supabase.co",
  });
  assert.equal(res.code, "OK");
  assert.equal(res.corrected, false);
  assert.equal(res.url, "https://gestao-no-foco.vercel.app");
});

test("API base ausente → origin oficial", () => {
  const res = resolveMobileApiBaseUrl({
    apiBase: undefined,
    supabaseUrl: "https://phjskpyuqlijvbgjdkss.supabase.co",
  });
  assert.equal(res.code, "API_BASE_MISSING");
  assert.equal(res.url, OFFICIAL_MOBILE_API_ORIGIN);
});

test("mesmo host supabase/api → IS_SUPABASE", () => {
  const res = resolveMobileApiBaseUrl({
    apiBase: "https://abc.supabase.co/",
    supabaseUrl: "https://abc.supabase.co",
  });
  assert.equal(res.code, "API_BASE_IS_SUPABASE");
});

test("login válido + API indisponível → permanece autenticado (rota não força login)", () => {
  assert.equal(resolveBootRoute("authenticated_without_tenant"), "/(auth)/tenant");
  assert.notEqual(resolveBootRoute("authenticated_without_tenant"), "/(auth)/login");
});

test("RBAC negado → access-denied path still not login from authenticated", () => {
  assert.equal(resolveBootRoute("authenticated"), "/(app)");
});

test("membership classify with API_BASE_IS_SUPABASE", () => {
  assert.equal(
    classifyMembershipError(new Error("HTTP 404"), "API_BASE_IS_SUPABASE"),
    "API_BASE_IS_SUPABASE",
  );
  assert.match(messageForPostLoginCode("API_BASE_IS_SUPABASE"), /Supabase/i);
});

test("membership network → MOBILE_API_UNREACHABLE", () => {
  assert.equal(
    classifyMembershipError(new Error("Falha de rede"), "OK"),
    "MOBILE_API_UNREACHABLE",
  );
});

test("sessão inválida → login", () => {
  assert.equal(resolveBootRoute("revoked"), "/(auth)/login");
});

test("nenhum loop: authenticated não resolve para login", () => {
  for (const state of [
    "authenticated",
    "authenticated_without_tenant",
    "authenticated_without_branch",
    "offline_limited",
  ]) {
    assert.notEqual(resolveBootRoute(state), "/(auth)/login");
  }
});
