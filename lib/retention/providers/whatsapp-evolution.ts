import { NextResponse } from "next/server";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type EvolutionWebhookBody = {
  event?: string;
  instance?: string;
  data?: {
    state?: string;
    connection?: string;
    number?: string;
    wuid?: string;
  };
};

/**
 * Webhook da Evolution API para status de conexão do canal por tenant.
 * Não há segredo global pra validar assinatura (a Evolution não assina por
 * HMAC como a Meta); a superfície de risco é baixa porque só atualiza status
 * de conexão, nunca dispara envio nem lê dados de outro tenant — o
 * instance_name já amarra a atualização a uma única linha via UPDATE.
 */
export async function POST(request: Request) {
  if (!isAdminClientAvailable()) {
    return NextResponse.json({ ok: false, error: "admin unavailable" }, { status: 503 });
  }
  let body: EvolutionWebhookBody;
  try {
    body = (await request.json()) as EvolutionWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const instanceName = body.instance;
  if (!instanceName) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();
  const event = (body.event ?? "").toUpperCase();
  const state = (body.data?.state ?? body.data?.connection ?? "").toLowerCase();

  if (event.includes("CONNECTION") && (state === "open" || state === "connected")) {
    const phone = body.data?.number ?? body.data?.wuid?.split("@")[0] ?? null;
    await admin
      .from("tenant_whatsapp_channels")
      .update({
        status: "connected",
        connected_at: new Date().toISOString(),
        phone_number: phone,
      })
      .eq("instance_name", instanceName);
    return NextResponse.json({ ok: true });
  }

  if (event.includes("CONNECTION") && (state === "close" || state === "closed")) {
    await admin
      .from("tenant_whatsapp_channels")
      .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
      .eq("instance_name", instanceName)
      .eq("status", "connected");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
