import {
  authorizeStockRoute,
  stockForbiddenOrError,
} from "@/lib/mobile/stock-route-auth";
import { composeStockProducts } from "@/lib/mobile/stock-compose";
import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tenantId: string }> };

/** GET /api/mobile/v1/tenants/:tenantId/estoque/produtos */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const auth = await authorizeStockRoute(request, tenantId);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const categoria = url.searchParams.get("categoria") ?? undefined;
  const marca = url.searchParams.get("marca") ?? undefined;
  const fornecedor = url.searchParams.get("fornecedor") ?? undefined;
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw === "ativo" || statusRaw === "inativo" || statusRaw === "all"
      ? statusRaw
      : undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;

  try {
    const dto = await composeStockProducts({
      client: auth.ctx.supabase,
      tenantId: auth.ctx.tenantId,
      permissions: auth.ctx.permissions,
      search,
      categoria,
      marca,
      fornecedor,
      status,
      page,
    });
    return mobileJson(dto);
  } catch (err) {
    return stockForbiddenOrError(err);
  }
}
