import { NextResponse } from "next/server";

export function mobileJson<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function mobileUnauthorized(message = "Não autorizado"): NextResponse {
  return mobileJson({ code: "UNAUTHORIZED", message }, 401);
}

export function mobileForbidden(message = "Acesso negado"): NextResponse {
  return mobileJson({ code: "FORBIDDEN", message }, 403);
}

export function mobileNotFound(message = "Não encontrado"): NextResponse {
  return mobileJson({ code: "NOT_FOUND", message }, 404);
}

export function mobileError(
  message = "Não foi possível concluir a operação",
  status = 500,
): NextResponse {
  return mobileJson({ code: "SERVER_ERROR", message }, status);
}
