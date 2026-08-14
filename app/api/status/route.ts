import { NextRequest, NextResponse } from "next/server";

import {
  REQUEST_ID_HEADER,
  resolveRequestId,
} from "@/lib/observability/request-id";
import { buildSystemStatus } from "@/lib/platform/health";
import { isMaintenanceMode } from "@/lib/platform/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * STATUS do sistema — visão operacional (sem secrets / sem versão Node).
 * GET /api/status
 */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const maintenance = isMaintenanceMode();
  const status = await buildSystemStatus(maintenance);

  return NextResponse.json(
    { ...status, requestId },
    {
      status: status.status === "down" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
}
