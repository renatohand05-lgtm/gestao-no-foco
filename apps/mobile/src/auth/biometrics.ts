import * as LocalAuthentication from "expo-local-authentication";

import {
  loadSessionMetadata,
  setBiometricEnabled,
} from "@/auth/secure-session";
import { authErrorFromCode } from "@/auth/errors";
import { logger } from "@/observability/logger";

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    return LocalAuthentication.isEnrolledAsync();
  } catch (err) {
    logger.warn("biometric.available_failed", {
      name: err instanceof Error ? err.name : "Error",
    });
    return false;
  }
}

export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      return "Face ID";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "Biometria";
    }
  } catch {
    /* ignore */
  }
  return "Desbloqueio do dispositivo";
}

export async function loadBiometricPref(): Promise<boolean> {
  try {
    const meta = await loadSessionMetadata();
    return meta.biometricEnabled;
  } catch (err) {
    logger.warn("biometric.pref_load_failed", {
      name: err instanceof Error ? err.name : "Error",
    });
    return false;
  }
}

export async function setBiometricPref(enabled: boolean): Promise<void> {
  await setBiometricEnabled(enabled);
  logger.info("biometric.pref_updated", { enabled });
}

/**
 * Desbloqueio local — nunca armazena senha.
 * Requer sessão já válida em SecureStore.
 * Nunca propaga exceção nativa para o caller.
 */
export async function unlockApp(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  try {
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
  } catch (err) {
    logger.error("biometric.unlock_threw", err);
    return {
      ok: false,
      message: authErrorFromCode("biometric_failed").message,
    };
  }
}
