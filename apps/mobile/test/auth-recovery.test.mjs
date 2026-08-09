import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyApiLoadFailure,
  classifyBiometricUnlockFailure,
  classifyRestoreFailure,
  messageForAuthFailure,
  titleForAuthFailure,
} from "../src/auth/recovery-policy.ts";
import {
  consumeBiometricUnlockAttempt,
  hasBiometricUnlockAttemptBeenUsed,
  __resetBootAttemptCountersForTests,
} from "../src/auth/boot-attempts.ts";

test("refresh token inválido online → local_credential_invalid (não rede)", () => {
  const kind = classifyRestoreFailure({
    network: "online",
    refreshOk: false,
    hasSessionAfterRefresh: false,
  });
  assert.equal(kind, "local_credential_invalid");
  assert.match(messageForAuthFailure(kind), /Credencial local inválida/i);
  assert.notEqual(kind, "network");
});

test("offline explícito → network", () => {
  const kind = classifyRestoreFailure({
    network: "offline",
    refreshOk: false,
    hasSessionAfterRefresh: false,
  });
  assert.equal(kind, "network");
});

test("erro biométrico não vira automaticamente erro de rede", () => {
  assert.equal(
    classifyBiometricUnlockFailure("Desbloqueio cancelado."),
    "biometric_cancelled",
  );
  assert.equal(
    classifyBiometricUnlockFailure("Biometria não configurada neste dispositivo."),
    "biometric_unavailable",
  );
  assert.equal(
    classifyBiometricUnlockFailure("Não foi possível validar a biometria."),
    "biometric_failed",
  );
  for (const kind of [
    "biometric_cancelled",
    "biometric_unavailable",
    "biometric_failed",
  ]) {
    assert.notEqual(kind, "network");
    assert.equal(/internet/i.test(messageForAuthFailure(kind)), false);
  }
});

test("Face ID cancelado classifica mensagem correta", () => {
  const kind = classifyBiometricUnlockFailure("Desbloqueio cancelado.");
  assert.equal(titleForAuthFailure(kind), "Desbloqueio cancelado");
});

test("API network vs session classification", () => {
  assert.equal(classifyApiLoadFailure(new Error("Falha de rede")), "network");
  assert.equal(classifyApiLoadFailure(new Error("Unauthorized 401")), "session_expired");
  assert.equal(classifyApiLoadFailure(new Error("jwt expired")), "session_expired");
  assert.equal(classifyApiLoadFailure(new Error("boom")), "unexpected");
});

test("uma tentativa biométrica automática por boot", () => {
  __resetBootAttemptCountersForTests();
  assert.equal(consumeBiometricUnlockAttempt(), true);
  assert.equal(hasBiometricUnlockAttemptBeenUsed(), true);
  assert.equal(consumeBiometricUnlockAttempt(), false);
  __resetBootAttemptCountersForTests();
  assert.equal(consumeBiometricUnlockAttempt(), true);
});
