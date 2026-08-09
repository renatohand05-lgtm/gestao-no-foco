/**
 * Controle de tentativas biométricas por cold start.
 * No máximo um desbloqueio automático Face ID por boot.
 */

let biometricUnlockUsed = false;

export function consumeBiometricUnlockAttempt(): boolean {
  if (biometricUnlockUsed) return false;
  biometricUnlockUsed = true;
  return true;
}

export function hasBiometricUnlockAttemptBeenUsed(): boolean {
  return biometricUnlockUsed;
}

/** Após login bem-sucedido ou reset local — permite novo ciclo no próximo boot. */
export function resetBootAttemptCounters(): void {
  biometricUnlockUsed = false;
}

/** Testes. */
export function __resetBootAttemptCountersForTests(): void {
  resetBootAttemptCounters();
}
