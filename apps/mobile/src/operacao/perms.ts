/**
 * Permissões de visualização da Operação (shell + telas).
 * Arquivo leve — seguro no bootstrap do tab layout (não importar sections.tsx).
 */
export const OPS_VIEW_PERMS = [
  "os.visualizar",
  "centro_operacoes.visualizar",
  "dashboard.operacional",
  "agenda.visualizar",
  "mecanicos.visualizar",
  "clientes.visualizar",
] as const;

export type OpsViewPerm = (typeof OPS_VIEW_PERMS)[number];
