import { NextResponse } from "next/server";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { processWhatsAppWebhook } from "@/lib/retention/webhook";
import { metaCloudConfig } from "@/lib/retention/providers/whatsapp-meta";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = metaCloudConfig().verifyToken;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}

export async function POST(request: Request) {
  if (!isAdminClientAvailable()) {
    return NextResponse.json({ ok: false, error: "admin unavailable" }, { status: 503 });
  }
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  try {
    const result = await processWhatsAppWebhook({
      rawBody,
      headers,
      admin: createAdminClient(),
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.note }, { status: 401 });
    }
    return NextResponse.json({ ok: true, duplicated: result.duplicated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
