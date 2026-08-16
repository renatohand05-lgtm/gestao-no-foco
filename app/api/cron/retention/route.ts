import { NextResponse } from "next/server";

import { runRetentionJob } from "@/lib/retention/process";

/**
 * Sprint 35.2 — cron preparado.
 * PRODUCTION: DISABLED (não cadastrar no Vercel até homologação).
 * Auth: Bearer CRON_SECRET (já usado pelo projeto; se ausente → 401).
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
  const result = await runRetentionJob();
  return NextResponse.json({
    ok: true,
    production: "DISABLED",
    notifyMode: "dry_run",
    ...result,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
