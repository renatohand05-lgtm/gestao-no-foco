import { NextResponse, type NextRequest } from "next/server";

import {
  checkApiRateLimit,
  createApiErrorResponse,
  extractBearerToken,
  validateApiAuthConfigured,
  verifyApiBearerToken,
  API_VERSION,
} from "@/lib/import-engine/connectors/api-contract";
import { isImportApiEnabled } from "@/lib/import-engine/enterprise-feature-flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/v1/import — stub arquitetural da API de importação.
 * Sem importação simulada de ERP externo nesta fase.
 */
export async function POST(request: NextRequest) {
  if (!isImportApiEnabled()) {
    const err = createApiErrorResponse(
      "preparing",
      "API de importação está em preparação (IMPORT_API_ENABLED).",
    );
    return NextResponse.json(err.body, { status: err.status });
  }

  const token = extractBearerToken(request.headers.get("authorization"));
  if (!validateApiAuthConfigured() || !verifyApiBearerToken(token)) {
    const err = createApiErrorResponse(
      "unauthorized",
      "Autenticação obrigatória — configure IMPORT_API_KEY.",
    );
    return NextResponse.json(err.body, { status: err.status });
  }

  const tenantSlug =
    request.headers.get("x-tenant-id") ?? request.headers.get("X-Tenant-Id") ?? "";
  if (!tenantSlug.trim()) {
    const err = createApiErrorResponse(
      "validation_error",
      "Header X-Tenant-Id é obrigatório.",
    );
    return NextResponse.json(err.body, { status: err.status });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkApiRateLimit(`${tenantSlug}:${clientIp}`);
  if (rl.remaining <= 0) {
    const err = createApiErrorResponse("rate_limited", "Limite de requisições excedido.");
    return NextResponse.json(err.body, {
      status: err.status,
      headers: { "X-RateLimit-Remaining": "0" },
    });
  }

  const err = createApiErrorResponse(
    "preparing",
    "Endpoint registrado — pipeline de importação via API ainda em preparação.",
    { details: { version: API_VERSION, tenant: tenantSlug } },
  );
  return NextResponse.json(err.body, { status: err.status });
}

export async function GET() {
  if (!isImportApiEnabled()) {
    const err = createApiErrorResponse(
      "preparing",
      "API de importação está em preparação (IMPORT_API_ENABLED).",
    );
    return NextResponse.json(err.body, { status: err.status });
  }

  return NextResponse.json({
    version: API_VERSION,
    status: "preparing",
    message: "Contrato API disponível — importação real ainda não habilitada.",
  });
}
