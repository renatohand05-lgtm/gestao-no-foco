import { uploadFieldSignature } from "@/lib/mobile/field-compose";
import {
  authorizeOpsRoute,
  opsForbiddenOrError,
} from "@/lib/mobile/operations-route-auth";
import { mobileError, mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string; id: string }> };

/** POST assinatura digital (PNG base64 → anexo etapa entrega) */
export async function POST(request: Request, context: RouteContext) {
  const { tenantId, id } = await context.params;
  const auth = await authorizeOpsRoute(request, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as {
      base64?: string;
      mimeType?: string;
      fileName?: string;
    };
    const raw = body.base64?.replace(/^data:[^;]+;base64,/, "") ?? "";
    if (!raw) return mobileError("Assinatura ausente", 400);
    const mimeType = body.mimeType || "image/png";
    const buf = Buffer.from(raw, "base64");
    if (buf.byteLength === 0) return mobileError("Assinatura vazia", 400);
    if (buf.byteLength > 5 * 1024 * 1024) {
      return mobileError("Assinatura excede 5MB", 400);
    }
    const file = new Blob([new Uint8Array(buf)], { type: mimeType });
    const result = await uploadFieldSignature({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      userId: auth.ctx.user.id,
      osId: id,
      file,
      nomeArquivo: body.fileName ?? "assinatura-cliente.png",
    });
    return mobileJson(result, 201);
  } catch (err) {
    return opsForbiddenOrError(err);
  }
}
