import { NextResponse } from "next/server";

import { processDueCrmSequences } from "@/lib/crm/sequence-processor";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron das sequências de automação comercial do CRM. Mesma auth do cron
 * de retenção: Bearer CRON_SECRET (ausente → 401).
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
  const result = await processDueCrmSequences(admin);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
