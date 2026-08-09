/**
 * Permissões de visualização do CRM (shell + telas).
 * Arquivo leve — seguro no bootstrap do tab layout (não importar sections.tsx).
 */
export const CRM_VIEW_PERMS = [
  "crm.visualizar",
  "crm.dashboard.visualizar",
  "crm.pipeline.visualizar",
  "clientes.visualizar",
] as const;

export type CrmViewPerm = (typeof CRM_VIEW_PERMS)[number];
