import { NextRequest, NextResponse } from "next/server";

import {
  REQUEST_ID_HEADER,
  resolveRequestId,
} from "@/lib/observability/request-id";
import { buildHealthCheck } from "@/lib/platform/health";
import { isMaintenanceMode } from "@/lib/platform/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HEALTH CHECK — liveness/readiness básico.
 * GET /api/health — sem secrets; inclui x-request-id.
 */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
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
      requestId,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store",
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
}
