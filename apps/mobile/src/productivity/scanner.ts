import { parseScanToQuery, resolveInternalDeepLink } from "@/productivity/deep-links";

export type ScanInterpretation =
  | { kind: "deep-link"; route: string }
  | { kind: "query"; q: string }
  | { kind: "invalid"; reason: string };

/**
 * Interpreta leitura de QR/código — nunca executa ação crítica.
 * Deep links internos vão para confirmação; demais viram termo de busca.
 */
export function interpretScanPayload(raw: string): ScanInterpretation {
  const code = parseScanToQuery(raw);
  if (!code) return { kind: "invalid", reason: "código vazio" };

  if (/^gof:\/\//i.test(code) || code.startsWith("/")) {
    const resolved = resolveInternalDeepLink(code);
    if (!resolved.ok) return { kind: "invalid", reason: resolved.reason };
    return { kind: "deep-link", route: resolved.route };
  }

  if (/^https?:\/\//i.test(code)) {
    return { kind: "invalid", reason: "URL externa bloqueada" };
  }

  return { kind: "query", q: code };
}

export const SCANNER_BARCODE_TYPES = [
  "qr",
  "ean13",
  "ean8",
  "code128",
  "code39",
  "upc_a",
  "upc_e",
] as const;
