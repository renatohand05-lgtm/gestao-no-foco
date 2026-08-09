import { NextResponse } from "next/server";

/** Correlation header espelhado do cliente mobile (`x-gof-request-id`). */
export const MOBILE_REQUEST_ID_HEADER = "x-gof-request-id";

export function readMobileRequestId(request: Request): string | undefined {
  const raw = request.headers.get(MOBILE_REQUEST_ID_HEADER)?.trim();
  return raw && raw.length > 0 ? raw.slice(0, 80) : undefined;
}

function withRequestId(
  headers: Record<string, string>,
  requestId?: string,
): Record<string, string> {
  if (!requestId) return headers;
  return { ...headers, [MOBILE_REQUEST_ID_HEADER]: requestId };
}

export function mobileJson<T>(
  data: T,
  status = 200,
  requestId?: string,
): NextResponse {
  const body =
    requestId && data && typeof data === "object" && !Array.isArray(data)
      ? { ...(data as object), requestId }
      : data;
  return NextResponse.json(body, {
    status,
    headers: withRequestId({ "Cache-Control": "no-store" }, requestId),
  });
}

export function mobileUnauthorized(
  message = "Não autorizado",
  requestId?: string,
): NextResponse {
  return mobileJson({ code: "UNAUTHORIZED", message }, 401, requestId);
}

export function mobileForbidden(
  message = "Acesso negado",
  requestId?: string,
): NextResponse {
  return mobileJson({ code: "FORBIDDEN", message }, 403, requestId);
}

export function mobileNotFound(
  message = "Não encontrado",
  requestId?: string,
): NextResponse {
  return mobileJson({ code: "NOT_FOUND", message }, 404, requestId);
}

export function mobileError(
  message = "Não foi possível concluir a operação",
  status = 500,
  requestId?: string,
): NextResponse {
  return mobileJson({ code: "SERVER_ERROR", message }, status, requestId);
}
