/**
 * Normalização de URLs públicas (sem side-effects / logger).
 */
export function normalizePublicUrl(url: string): string {
  let next = url.trim();
  next = next.replace(/\/rest\/v1\/?$/i, "");
  next = next.replace(/\/+$/, "");
  return next;
}
