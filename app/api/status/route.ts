import { NextResponse } from "next/server";

import { buildSystemStatus } from "@/lib/platform/health";
import { isMaintenanceMode } from "@/lib/platform/maintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * STATUS do sistema — visão operacional (sem secrets).
 * GET /api/status
 */
export async function GET() {
  const maintenance = isMaintenanceMode();
  const status = await buildSystemStatus(maintenance);

  return NextResponse.json(status, {
    status: status.status === "down" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
