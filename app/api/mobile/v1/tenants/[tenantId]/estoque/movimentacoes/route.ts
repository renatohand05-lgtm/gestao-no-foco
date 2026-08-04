import {
  authorizeStockRoute,
  stockForbiddenOrError,
} from "@/lib/mobile/stock-route-auth";
import { composeStockMovements } from "@/lib/mobile/stock-compose";
import { mobileJson } from "@/lib/mobile/response";
import type { MovimentacaoTipo } from "@/types/estoque";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/estoque/movimentacoes */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeStockRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const tipoRaw = url.searchParams.get("tipo");
  const tipo =
    tipoRaw === "entrada" ||
    tipoRaw === "saida" ||
    tipoRaw === "ajuste" ||
    tipoRaw === "all"
      ? (tipoRaw as MovimentacaoTipo | "all")
      : "all";
  const page = Number(url.searchParams.get("page") ?? "1") || 1;

  try {
    const dto = await composeStockMovements({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      search,
      tipo,
      page,
    });
    return mobileJson(dto);
  } catch (err) {
    return stockForbiddenOrError(err);
  }
}
