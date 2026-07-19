/**
 * Modo manutenção — Sprint 13.21.
 * Ativar com MAINTENANCE_MODE=1 (ou true/yes).
 */

export function isMaintenanceMode(): boolean {
  const raw = (process.env.MAINTENANCE_MODE || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Paths liberados durante manutenção (health/status + tela). */
export function isMaintenanceBypassPath(pathname: string): boolean {
  if (pathname === "/manutencao") return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/status")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}
