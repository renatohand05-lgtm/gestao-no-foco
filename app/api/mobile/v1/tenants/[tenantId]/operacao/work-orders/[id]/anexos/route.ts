import {
  listFieldAnexos,
  uploadFieldAnexo,
} from "@/lib/mobile/field-compose";
import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { mobileError, mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

function blobFromBase64(body: {
  base64?: string;
  mimeType?: string;
}): Blob {
  const raw = body.base64?.replace(/^data:[^;]+;base64,/, "") ?? "";
  if (!raw) throw new Error("Arquivo ausente");
  const mimeType = body.mimeType || "image/jpeg";
  const buf = Buffer.from(raw, "base64");
  if (buf.byteLength === 0) throw new Error("Arquivo vazio");
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("Arquivo excede 5MB");
  return new Blob([new Uint8Array(buf)], { type: mimeType });
}

/** GET galeria/anexos da OS */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const signed = url.searchParams.get("signed") !== "0";
    const items = await listFieldAnexos({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      osId: id,
      includeSignedUrls: signed,
    });
    return mobileJson({ items });
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}

/** POST upload foto/anexo (JSON base64 autenticado) */
export async function POST(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as {
      base64?: string;
      mimeType?: string;
      fileName?: string;
      etapa?: string;
      tipo?: string;
      legenda?: string | null;
      observacao?: string | null;
      checklistItemId?: string | null;
    };
    const file = blobFromBase64(body);
    const result = await uploadFieldAnexo({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      userId: auth.ctx.user.id,
      file,
      meta: {
        ordemServicoId: id,
        etapa: body.etapa ?? "execucao",
        tipo: body.tipo ?? "foto",
        nomeArquivo: body.fileName ?? "foto-campo.jpg",
        checklistItemId: body.checklistItemId,
        legenda: body.legenda,
        observacao: body.observacao,
      },
    });
    return mobileJson(result, 201);
  } catch (err) {
    if (err instanceof Error && /Arquivo|excede|permitido|Extensão/i.test(err.message)) {
      return mobileError(err.message, 400);
    }
    return opsForbiddenOrError(err);
  }
}
