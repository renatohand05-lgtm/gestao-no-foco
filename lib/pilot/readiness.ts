/**
 * Sprint 34.5 — prontidão de piloto: módulos mock/parcial não devem
 * parecer prontos na navegação nem alimentar dados fictícios.
 */

/** Itens de sidebar ocultos no piloto (rota profunda pode existir com "Em breve"). */
export const PILOT_HIDDEN_NAV_IDS = ["automacoes"] as const;

/** Rotas canônicas reais para Integrações (importação de arquivos). */
export function integrationsImportPath(tenantSlug: string): string {
  return `/${tenantSlug}/integracoes/importar`;
}

export function isPilotHiddenNavId(id: string): boolean {
  return (PILOT_HIDDEN_NAV_IDS as readonly string[]).includes(id);
}
