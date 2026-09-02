import { NextResponse } from "next/server";

import { runPriceStepUpJob } from "@/lib/billing/price-stepup";

/**
 * Cron de step-up de preço promocional (plano Início e afins). Mesmo
 * padrão de auth do cron de retenção: Bearer CRON_SECRET (ausente → 401).
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
  const result = await runPriceStepUpJob();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
