/**
 * Sprint 21.1 — Mapeamento padrão role → permissões.
 * Fonte única · sem duplicação de regra de negócio.
 */

import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "./permissions.ts";
import type { RoleId } from "./roles.ts";

function unique(keys: readonly PermissionKey[]): readonly PermissionKey[] {
  return [...new Set(keys)];
}

function byPrefix(
  prefixes: readonly string[],
  filter?: (key: PermissionKey) => boolean,
): PermissionKey[] {
  return ALL_PERMISSION_KEYS.filter((key) => {
    const ok = prefixes.some(
      (p) => key === p || key.startsWith(`${p}.`) || key.startsWith(p),
    );
    return ok && (filter ? filter(key) : true);
  });
}

const READ_ONLY = (key: PermissionKey) =>
  key.includes(".visualizar") ||
  key.includes(".ver_") ||
  key.startsWith("dashboard.") ||
  key === "auditoria.visualizar" ||
  key === "auditoria.exportar" ||
  key === "relatorios.visualizar" ||
  key === "relatorios.exportar" ||
  key.endsWith(".exportar");

const AUDITOR_KEYS = unique(
  ALL_PERMISSION_KEYS.filter(
    (key) =>
      READ_ONLY(key) &&
      !key.includes(".criar") &&
      !key.includes(".editar") &&
      !key.includes(".excluir") &&
      !key.includes(".aprovar") &&
      !key.includes(".cancelar") &&
      !key.includes(".desativar") &&
      !key.includes(".atribuir") &&
      !key.includes(".transferir") &&
      !key.includes(".conciliar") &&
      !key.includes(".movimentar") &&
      !key.includes(".ajustar") &&
      !key.includes(".inventariar") &&
      !key.includes(".receber") &&
      !key.includes(".finalizar") &&
      !key.includes(".reabrir") &&
      !key.includes(".agendar") &&
      key !== "configuracoes.editar" &&
      key !== "configuracoes.integracoes" &&
      key !== "configuracoes.faturamento" &&
      key !== "configuracoes.tenant" &&
      key !== "usuarios.criar" &&
      key !== "usuarios.editar" &&
      key !== "usuarios.desativar" &&
      key !== "usuarios.excluir" &&
      key !== "usuarios.atribuir_role" &&
      key !== "usuarios.atribuir_permissao" &&
      key !== "relatorios.criar" &&
      key !== "relatorios.agendar",
  ),
);

const VISUALIZACAO_KEYS = unique([
  ...byPrefix(["dashboard"], (k) => k !== "dashboard.rh"),
  "analytics.visualizar",
  "analytics.executivo",
  "financeiro.visualizar",
  "estoque.visualizar",
  "compras.visualizar",
  "vendas.visualizar",
  "os.visualizar",
  "crm.visualizar",
  "relatorios.visualizar",
  "configuracoes.visualizar",
]);

/** Permissões de plataforma (somente super_admin). */
export const PLATFORM_ONLY_PERMISSIONS = [
  "configuracoes.faturamento",
] as const satisfies readonly PermissionKey[];

const TENANT_ALL = ALL_PERMISSION_KEYS.filter(
  (k) => !(PLATFORM_ONLY_PERMISSIONS as readonly string[]).includes(k),
);

const DIRETOR_KEYS = unique([
  ...TENANT_ALL.filter(
    (k) =>
      k !== "configuracoes.tenant" &&
      k !== "configuracoes.faturamento" &&
      k !== "usuarios.excluir" &&
      k !== "usuarios.atribuir_permissao",
  ),
]);

const FINANCEIRO_KEYS = unique([
  ...byPrefix(["financeiro"]),
  "dashboard.financeiro",
  "dashboard.executivo",
  "analytics.visualizar",
  "analytics.executivo",
  "analytics.financeiro",
  "analytics.tributario",
  "analytics.exportar",
  "relatorios.visualizar",
  "relatorios.exportar",
  "relatorios.criar",
]);

const COMERCIAL_KEYS = unique([
  ...byPrefix(["vendas"]),
  ...byPrefix(["crm"]),
  "dashboard.comercial",
  "dashboard.executivo",
  "analytics.visualizar",
  "analytics.vendas",
  "analytics.operacional",
  "os.visualizar",
  "relatorios.visualizar",
  "relatorios.exportar",
]);

const OPERACOES_KEYS = unique([
  ...byPrefix(["os"]),
  "dashboard.operacional",
  "dashboard.executivo",
  "analytics.visualizar",
  "analytics.operacional",
  "analytics.estoque",
  "estoque.visualizar",
  "estoque.movimentar",
  "crm.visualizar",
  "vendas.visualizar",
  "relatorios.visualizar",
]);

const OFICINA_KEYS = unique([
  "os.visualizar",
  "os.criar",
  "os.editar",
  "os.finalizar",
  "estoque.visualizar",
  "estoque.movimentar",
  "dashboard.operacional",
  "crm.visualizar",
]);

const ESTOQUE_KEYS = unique([
  ...byPrefix(["estoque"]),
  "dashboard.estoque",
  "compras.visualizar",
  "compras.receber",
  "relatorios.visualizar",
  "relatorios.exportar",
]);

const COMPRAS_KEYS = unique([
  ...byPrefix(["compras"]),
  "estoque.visualizar",
  "compras.receber",
  "dashboard.estoque",
  "financeiro.visualizar",
  "relatorios.visualizar",
]);

const ATENDIMENTO_KEYS = unique([
  "crm.visualizar",
  "crm.criar",
  "crm.editar",
  "os.visualizar",
  "os.criar",
  "os.editar",
  "vendas.visualizar",
  "vendas.criar",
  "dashboard.comercial",
  "dashboard.operacional",
]);

const CAIXA_KEYS = unique([
  "vendas.visualizar",
  "vendas.criar",
  "vendas.editar",
  "vendas.cancelar",
  "financeiro.visualizar",
  "financeiro.criar",
  "financeiro.ver_saldos",
  "estoque.visualizar",
  "crm.visualizar",
  "dashboard.comercial",
  "dashboard.financeiro",
]);

/**
 * Matriz canônica role → permissões.
 * super_admin: catálogo completo (plataforma).
 * proprietario: tudo do tenant (sem faturamento de plataforma).
 */
export const ROLE_PERMISSIONS: Readonly<Record<RoleId, readonly PermissionKey[]>> =
  {
    super_admin: ALL_PERMISSION_KEYS,
    proprietario: unique(TENANT_ALL),
    diretor: DIRETOR_KEYS,
    financeiro: FINANCEIRO_KEYS,
    comercial: COMERCIAL_KEYS,
    operacoes: OPERACOES_KEYS,
    oficina: OFICINA_KEYS,
    estoque: ESTOQUE_KEYS,
    compras: COMPRAS_KEYS,
    atendimento: ATENDIMENTO_KEYS,
    caixa: CAIXA_KEYS,
    auditor: AUDITOR_KEYS,
    visualizacao: VISUALIZACAO_KEYS,
  };

export function getPermissionsForRole(
  roleId: string,
): readonly PermissionKey[] {
  if (roleId in ROLE_PERMISSIONS) {
    return ROLE_PERMISSIONS[roleId as RoleId];
  }
  return [];
}

export function getPermissionsForRoles(
  roleIds: readonly string[],
): readonly PermissionKey[] {
  const set = new Set<PermissionKey>();
  for (const id of roleIds) {
    for (const p of getPermissionsForRole(id)) {
      set.add(p);
    }
  }
  return [...set];
}

export function roleHasPermission(
  roleId: string,
  permission: string,
): boolean {
  return getPermissionsForRole(roleId).includes(permission as PermissionKey);
}
