import { NextResponse } from "next/server";

import {
  aprovacaoPublicaService,
  type InspecaoPublicaPayload,
} from "@/lib/ordens/aprovacao-publica-service";
import { osAprovacaoPublicaSchema } from "@/lib/ordens/validations";

function extractClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const ip = extractClientIp(_request);

  try {
    const payload = await aprovacaoPublicaService.loadByToken(token, ip);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar inspeção.";
    const status = message.includes("Muitas tentativas") ? 429 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const ip = extractClientIp(request);
  const userAgent = request.headers.get("user-agent");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = osAprovacaoPublicaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  try {
    const result = await aprovacaoPublicaService.approveByToken(token, {
      ...parsed.data,
      ip,
      userAgent,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao registrar aprovação.";
    const status = message.includes("Muitas tentativas") ? 429 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export type { InspecaoPublicaPayload };
