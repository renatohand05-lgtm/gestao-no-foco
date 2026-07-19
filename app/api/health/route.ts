import { NextResponse } from "next/server";

import { buildHealthCheck } from "@/lib/platform/health";
import { isMaintenanceMode } from "@/lib/platform/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HEALTH CHECK — liveness/readiness básico.
 * GET /api/health
 */
export async function GET() {
  const health = await buildHealthCheck();
  const maintenance = isMaintenanceMode();
  const statusCode =
    health.status === "ok" && !maintenance
      ? 200
      : health.status === "down"
        ? 503
        : 200;

  return NextResponse.json(
    {
      ok: health.status === "ok" && !maintenance,
      ...health,
      maintenance,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
