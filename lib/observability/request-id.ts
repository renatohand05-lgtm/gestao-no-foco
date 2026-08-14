/**
 * Request / correlation IDs — Sprint 34.6.
 * Reutiliza x-request-id / x-correlation-id quando presentes.
 */

export const REQUEST_ID_HEADER = "x-request-id";
export const CORRELATION_ID_HEADER = "x-correlation-id";

export function resolveRequestId(headers: {
  get(name: string): string | null;
}): string {
  return (
    headers.get(REQUEST_ID_HEADER) ||
    headers.get(CORRELATION_ID_HEADER) ||
    crypto.randomUUID()
  );
}

export function requestIdHeaders(requestId: string): HeadersInit {
  return {
    [REQUEST_ID_HEADER]: requestId,
    [CORRELATION_ID_HEADER]: requestId,
  };
}
