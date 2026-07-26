/**
 * Sprint 21.1 — Papéis padrão do sistema.
 */

import type { Role, RoleScope, RoleType } from "./types.ts";

export const SYSTEM_ROLE_IDS = [
  "super_admin",
  "proprietario",
  "diretor",
  "financeiro",
  "comercial",
  "operacoes",
  "oficina",
  "estoque",
  "compras",
  "atendimento",
  "caixa",
  "auditor",
  "visualizacao",
] as const;

export type RoleId = (typeof SYSTEM_ROLE_IDS)[number];

function role(
  id: RoleId,
  name: string,
  description: string,
  level: number,
  scope: RoleScope,
  type: RoleType = "system",
): Role {
  return { id, name, description, level, scope, type };
}

/** Catálogo de papéis padrão (hierarquia por nível). */
export const SYSTEM_ROLES: readonly Role[] = [
  role(
    "super_admin",
    "Super Admin",
    "Administração da plataforma · acesso total · não confundir com proprietário do tenant",
    1000,
    "platform",
  ),
  role(
    "proprietario",
    "Proprietário",
    "Acesso total dentro do próprio tenant",
    900,
    "tenant",
  ),
  role(
    "diretor",
    "Diretor",
    "Acesso executivo amplo · sem configurações de plataforma",
    800,
    "tenant",
  ),
  role(
    "financeiro",
    "Financeiro",
    "Operações e visão do módulo financeiro",
    500,
    "module",
  ),
  role(
    "comercial",
    "Comercial",
    "Vendas, CRM e dashboards comerciais",
    500,
    "module",
  ),
  role(
    "operacoes",
    "Operações",
    "Ordens de serviço e operação da oficina",
    500,
    "module",
  ),
  role(
    "oficina",
    "Oficina",
    "Execução operacional de OS na oficina",
    400,
    "module",
  ),
  role(
    "estoque",
    "Estoque",
    "Gestão de estoque e inventário",
    500,
    "module",
  ),
  role(
    "compras",
    "Compras",
    "Pedidos de compra e recebimento",
    500,
    "module",
  ),
  role(
    "atendimento",
    "Atendimento",
    "Atendimento ao cliente e CRM operacional",
    400,
    "module",
  ),
  role(
    "caixa",
    "Caixa",
    "Operações de caixa e vendas no balcão",
    400,
    "module",
  ),
  role(
    "auditor",
    "Auditor",
    "Leitura ampla · sem criação, edição, aprovação ou exclusão",
    300,
    "tenant",
  ),
  role(
    "visualizacao",
    "Visualização",
    "Leitura limitada · sem ações destrutivas",
    100,
    "tenant",
  ),
] as const;

export const ROLE_BY_ID: ReadonlyMap<string, Role> = new Map(
  SYSTEM_ROLES.map((r) => [r.id, r]),
);

export function isSystemRole(id: string): id is RoleId {
  return ROLE_BY_ID.has(id);
}

export function getRole(id: string): Role | undefined {
  return ROLE_BY_ID.get(id);
}

export function listSystemRoles(): readonly Role[] {
  return SYSTEM_ROLES;
}

/** Compara hierarquia (maior nível vence). Roles desconhecidas = 0. */
export function compareRoleLevel(a: string, b: string): number {
  const la = ROLE_BY_ID.get(a)?.level ?? 0;
  const lb = ROLE_BY_ID.get(b)?.level ?? 0;
  return la - lb;
}
