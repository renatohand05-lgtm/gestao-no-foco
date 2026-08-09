/**
 * Sprint 32.2 — Telemetria mobile sanitizada (console sink).
 * Sem tokens, senhas, documentos, PII ou payloads financeiros detalhados.
 */
import Constants from "expo-constants";
import * as Application from "expo-application";

import { logger } from "@/observability/logger";

export const TELEMETRY_EVENTS = [
  "APP_STARTED",
  "APP_READY",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "SESSION_RESTORED",
  "SESSION_REFRESH_FAILED",
  "TENANT_SELECTED",
  "BRANCH_SELECTED",
  "RBAC_LOADED",
  "RBAC_HYDRATE_FAILED",
  "API_FAILED",
  "SCREEN_LOAD_FAILED",
  "OFFLINE_ENTERED",
  "OFFLINE_RECOVERED",
  "BIOMETRIC_SUCCESS",
  "BIOMETRIC_FAILED",
  "UNHANDLED_ERROR",
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENTS)[number];

export type TelemetryContext = {
  requestId?: string;
  endpoint?: string;
  status?: number;
  code?: string;
  hasTenant?: boolean;
  hasBranch?: boolean;
  screen?: string;
  reason?: string;
  build?: string;
  version?: string;
  durationMs?: number;
};

function appMeta(): Pick<TelemetryContext, "version" | "build"> {
  return {
    version:
      Application.nativeApplicationVersion ??
      Constants.expoConfig?.version ??
      "1.10.0",
    build: Application.nativeBuildVersion ?? "unknown",
  };
}

function scrub(input?: TelemetryContext): TelemetryContext {
  const base = appMeta();
  if (!input) return base;
  return {
    version: base.version,
    build: base.build,
    requestId: input.requestId,
    endpoint: input.endpoint?.replace(/[0-9a-f-]{20,}/gi, ":id"),
    status: input.status,
    code: input.code,
    hasTenant: input.hasTenant,
    hasBranch: input.hasBranch,
    screen: input.screen,
    reason: input.reason?.slice(0, 80),
    durationMs: input.durationMs,
  };
}

function levelFor(event: TelemetryEventName): "info" | "warn" | "error" {
  if (event === "UNHANDLED_ERROR") return "error";
  if (
    event.endsWith("_FAILED") ||
    event === "API_FAILED" ||
    event === "SCREEN_LOAD_FAILED"
  ) {
    return "warn";
  }
  return "info";
}

/** Emite evento canônico. Sink atual: logger sanitizado. */
export function trackTelemetry(
  event: TelemetryEventName,
  context?: TelemetryContext,
): void {
  const payload = scrub(context);
  logger[levelFor(event)](`telemetry.${event}`, payload);
}

export const mobileTelemetry = {
  track: trackTelemetry,
  events: TELEMETRY_EVENTS,
};
