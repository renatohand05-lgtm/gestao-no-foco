import { NextResponse } from "next/server";

import { snapshotDailyKpisForAllTenants } from "@/lib/dashboard/kpi-snapshot-service";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron diário que grava o snapshot de faturamento/lucro/caixa de cada
 * tenant — alimenta os mini-gráficos reais do dashboard. Mesma auth dos
 * outros crons: Bearer CRON_SECRET (ausente → 401).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET ausente — job desabilitado." },
      { status: 401 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await snapshotDailyKpisForAllTenants(admin);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
