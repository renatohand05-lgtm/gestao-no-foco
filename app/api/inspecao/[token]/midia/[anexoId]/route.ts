import { NextResponse } from "next/server";

import { aprovacaoPublicaService } from "@/lib/ordens/aprovacao-publica-service";
import { OS_INSPECAO_BUCKET } from "@/lib/ordens/inspecao-storage-service";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";

function extractClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; anexoId: string }> },
) {
  const { token, anexoId } = await context.params;
  const ip = extractClientIp(request);
  const redirect = new URL(request.url).searchParams.get("redirect") === "1";

  if (!isAdminClientAvailable()) {
    return NextResponse.json(
      { ok: false, error: "Serviço de mídia indisponível." },
      { status: 503 },
    );
  }

  let detalhes;
  try {
    const payload = await aprovacaoPublicaService.loadByToken(token, ip);
    if (!payload.ok) {
      return NextResponse.json(payload, { status: 403 });
    }
    detalhes = payload;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token inválido.";
    const status = message.includes("Muitas tentativas") ? 429 : 403;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const anexos = (detalhes.anexos ?? []) as Array<{ id: string }>;
  if (!anexos.some((a) => a.id === anexoId)) {
    return NextResponse.json(
      { ok: false, error: "Anexo não autorizado para este link." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { data: anexo, error: fetchError } = await admin
    .from("ordem_servico_anexos" as never)
    .select("storage_path, mime_type")
    .eq("id", anexoId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError || !anexo) {
    return NextResponse.json(
      { ok: false, error: "Anexo não encontrado." },
      { status: 404 },
    );
  }

  const storagePath = (anexo as { storage_path: string | null }).storage_path;
  if (!storagePath) {
    return NextResponse.json(
      { ok: false, error: "Anexo sem arquivo." },
      { status: 404 },
    );
  }

  const { data: signed, error: signError } = await admin.storage
    .from(OS_INSPECAO_BUCKET)
    .createSignedUrl(storagePath, 120);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: signError?.message ?? "Erro ao gerar URL." },
      { status: 500 },
    );
  }

  if (redirect) {
    return NextResponse.redirect(signed.signedUrl);
  }

  return NextResponse.json({ ok: true, url: signed.signedUrl, expiresIn: 120 });
}
