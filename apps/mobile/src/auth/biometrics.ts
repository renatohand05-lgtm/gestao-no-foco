import * as LocalAuthentication from "expo-local-authentication";

import {
  loadSessionMetadata,
  setBiometricEnabled,
} from "@/auth/secure-session";
import { authErrorFromCode } from "@/auth/errors";
import { logger } from "@/observability/logger";

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "Face ID";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "Biometria";
  }
  return "Desbloqueio do dispositivo";
}

export async function loadBiometricPref(): Promise<boolean> {
  const meta = await loadSessionMetadata();
  return meta.biometricEnabled;
}

export async function setBiometricPref(enabled: boolean): Promise<void> {
  await setBiometricEnabled(enabled);
  logger.info("biometric.pref_updated", { enabled });
}

/**
 * Desbloqueio local — nunca armazena senha.
 * Requer sessão já válida em SecureStore.
 */
export async function unlockApp(): Promise<{ ok: true } | { ok: false; message: string }> {
  const enabled = await loadBiometricPref();
  if (!enabled) {
    return { ok: true };
  }

  const available = await isBiometricAvailable();
  if (!available) {
    return {
      ok: false,
      message: authErrorFromCode("biometric_not_enrolled").message,
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Desbloquear Gestão no Foco",
    cancelLabel: "Cancelar",
    disableDeviceFallback: false,
  });

  if (result.success) {
    return { ok: true };
  }

  if (result.error === "user_cancel" || result.error === "system_cancel") {
    return {
      ok: false,
      message: authErrorFromCode("biometric_cancelled").message,
    };
  }

  return {
    ok: false,
    message: authErrorFromCode("biometric_failed").message,
  };
}
