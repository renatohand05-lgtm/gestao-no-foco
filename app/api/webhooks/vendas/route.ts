import { NextResponse, type NextRequest } from "next/server";

import { verifyApiKey } from "@/lib/integracoes-vendas/api-key-service";
import { ingestExternalVenda } from "@/lib/integracoes-vendas/venda-ingest-service";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string, now = Date.now()): boolean {
  const bucket = rateLimitMap.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  const apiKey =
    request.headers.get("x-api-key") ?? request.headers.get("X-Api-Key") ?? "";

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { ok: false, error: "Limite de requisições excedido." },
      { status: 429 },
    );
  }

  const admin = createAdminClient();

  const auth = await verifyApiKey(admin, apiKey);
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "Chave de API inválida, ausente ou revogada." },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Corpo da requisição precisa ser JSON válido." },
      { status: 400 },
    );
  }

  const idExterno =
    payload && typeof payload === "object" && "id_externo" in payload
      ? String((payload as Record<string, unknown>).id_externo)
      : "";
  if (!idExterno) {
    return NextResponse.json(
      { ok: false, error: "Campo 'id_externo' é obrigatório." },
      { status: 400 },
    );
  }

  // Idempotência real, em banco: a constraint UNIQUE (tenant_id, idempotency_key)
  // garante que duas chamadas com o mesmo id_externo nunca criam duas vendas,
  // mesmo em concorrência entre instâncias serverless diferentes.
  const outcome = await ingestExternalVenda(admin, auth.tenantId, payload);

  const { error: duplicateCheckError } = await admin
    .from("integration_webhook_events" as never)
    .insert({
      tenant_id: auth.tenantId,
      api_key_id: auth.apiKeyId,
      idempotency_key: idExterno,
      outcome: outcome.ok ? "accepted" : "rejected",
      reason: outcome.ok ? null : outcome.error,
      venda_id: outcome.ok ? outcome.vendaId : null,
      body_bytes: Buffer.byteLength(rawBody, "utf8"),
    } as never);

  if (duplicateCheckError) {
    // Violação da unique constraint = já processamos esse id_externo antes.
    if (
      "code" in duplicateCheckError &&
      (duplicateCheckError as { code?: string }).code === "23505"
    ) {
      // Se a venda tinha sido criada nesse retry (outcome.ok), desfaz — o
      // registro de auditoria original é a fonte da verdade.
      if (outcome.ok) {
        await admin.from("vendas").delete().eq("id", outcome.vendaId);
      }
      return NextResponse.json(
        { ok: true, status: "duplicate", message: "id_externo já processado anteriormente." },
        { status: 200 },
      );
    }
  }

  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 422 });
  }

  return NextResponse.json(
    {
      ok: true,
      status: "created",
      venda_id: outcome.vendaId,
      venda_numero: outcome.vendaNumero,
    },
    { status: 201 },
  );
}
