/**
 * Health / status do sistema — Sprint 13.21 / reforço 34.6.
 * Somente leitura; sem expor secrets.
 */

export type HealthStatus = "ok" | "degraded" | "down";

export type HealthCheckResult = {
  status: HealthStatus;
  checks: Record<
    string,
    {
      ok: boolean;
      ms?: number;
      detail?: string;
    }
  >;
  at: string;
  version: string;
  env: string;
};

export type SystemStatus = {
  status: HealthStatus;
  app: string;
  version: string;
  env: string;
  maintenance: boolean;
  /** Billing permanece frozen — apenas estado seguro (sem secrets). */
  billing: {
    frozen: true;
    realChargesAuthorized: false;
    asaasEnv: "sandbox" | "unknown";
  };
  uptimeSeconds: number;
  at: string;
  checks: HealthCheckResult["checks"];
};

const startedAt = Date.now();

export function getAppVersion(): string {
  return process.env.npm_package_version || "0.1.0";
}

export function getRuntimeEnv(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

function billingPublicState(): SystemStatus["billing"] {
  const asaas = (process.env.ASAAS_ENV || "sandbox").toLowerCase();
  return {
    frozen: true,
    realChargesAuthorized: false,
    asaasEnv: asaas === "production" ? "unknown" : "sandbox",
  };
}

export async function probeSupabase(): Promise<{
  ok: boolean;
  ms: number;
  detail?: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, ms: 0, detail: "env_missing" };
  }
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: key },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    const ms = Date.now() - started;
    if (res.ok || res.status === 404) {
      return { ok: true, ms };
    }
    return { ok: false, ms, detail: `http_${res.status}` };
  } catch (error) {
    return {
      ok: false,
      ms: Date.now() - started,
      detail: error instanceof Error ? error.message : "fetch_failed",
    };
  }
}

export async function buildHealthCheck(): Promise<HealthCheckResult> {
  const supabase = await probeSupabase();
  const envOk = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const serviceRoleConfigured = Boolean(
    (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  );

  const checks: HealthCheckResult["checks"] = {
    env: { ok: envOk, detail: envOk ? "configured" : "missing_supabase_env" },
    supabase: {
      ok: supabase.ok,
      ms: supabase.ms,
      detail: supabase.detail,
    },
    serviceRole: {
      ok: serviceRoleConfigured,
      detail: serviceRoleConfigured ? "configured" : "missing",
    },
  };

  const criticalOk = checks.env.ok && checks.supabase.ok;
  const anyOk = Object.values(checks).some((c) => c.ok);

  return {
    status: criticalOk
      ? checks.serviceRole.ok
        ? "ok"
        : "degraded"
      : anyOk
        ? "degraded"
        : "down",
    checks,
    at: new Date().toISOString(),
    version: getAppVersion(),
    env: getRuntimeEnv(),
  };
}

export async function buildSystemStatus(
  maintenance: boolean,
): Promise<SystemStatus> {
  const health = await buildHealthCheck();
  return {
    status: maintenance ? "degraded" : health.status,
    app: "gestao-no-foco",
    version: health.version,
    env: health.env,
    maintenance,
    billing: billingPublicState(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    at: health.at,
    checks: health.checks,
  };
}
