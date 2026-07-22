import type { TenantRole } from "@/lib/constants";

/** Chaves de permissão do adendo oficina (Sprint 14). */
export const PERMISSION_KEYS = [
  "venda_rapida.criar",
  "venda_rapida.sem_cliente",
  "desconto.aplicar",
  "desconto.aprovar",
  "desconto.abaixo_margem",
  "venda.cancelar",
  "venda.devolver",
  "estoque.estornar",
  "venda.editar_concluida",
  "dashboard.descontos.ver",
  "os.criar_cliente_forcado",
  "estoque.saldo_negativo",
  "os.visualizar_dashboard",
  "os.criar",
  "os.editar",
  "os.adicionar_item_personalizado",
  "os.converter_item_personalizado",
  "os.excluir_rascunho",
  "os.cancelar",
  "os.arquivar",
  "os.restaurar",
  "os.visualizar_canceladas",
  "vendas.visualizar_dashboard",
  "dashboard.visualizar_executivo",
  "dashboard.visualizar_financeiro",
  "dashboard.visualizar_comercial",
  "dashboard.visualizar_estoque",
  "dashboard.visualizar_mecanicos",
  "dashboard.personalizar",
  "centro_operacoes.visualizar",
  "centro_operacoes.alterar_status",
  "centro_operacoes.ver_alertas",
  "mecanicos.visualizar",
  "mecanicos.criar",
  "mecanicos.editar",
  "mecanicos.ver_custo",
  "mecanicos.editar_custo",
  "mecanicos.gerar_folha",
  "mecanicos.apontar_horas",
  "mecanicos.apontar_horas_manual",
  "mecanicos.visualizar_dashboard",
  "os.atribuir_mecanico",
  "os.transferir_mecanico",
  "financeiro.gerar_obrigacao_mecanico",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** Fallback quando a tabela ainda não foi seedada. */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  TenantRole,
  Record<PermissionKey, boolean>
> = {
  owner: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<
    PermissionKey,
    boolean
  >,
  admin: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<
    PermissionKey,
    boolean
  >,
  manager: Object.fromEntries(
    PERMISSION_KEYS.map((k) => [k, k !== "venda.editar_concluida"]),
  ) as Record<PermissionKey, boolean>,
  member: Object.fromEntries(
    PERMISSION_KEYS.map((k) => [
      k,
      k === "venda_rapida.criar" ||
        k === "venda_rapida.sem_cliente" ||
        k === "venda.cancelar" ||
        k === "os.visualizar_dashboard" ||
        k === "os.criar" ||
        k === "os.editar" ||
        k === "os.visualizar_canceladas" ||
        k === "vendas.visualizar_dashboard" ||
        k === "dashboard.visualizar_executivo" ||
        k === "centro_operacoes.visualizar" ||
        k === "centro_operacoes.ver_alertas" ||
        k === "mecanicos.visualizar" ||
        k === "mecanicos.apontar_horas" ||
        k === "mecanicos.visualizar_dashboard" ||
        k === "os.atribuir_mecanico",
    ]),
  ) as Record<PermissionKey, boolean>,
};

export const DESCONTO_TIPOS = [
  "fidelizacao",
  "cliente_recorrente",
  "negociacao_comercial",
  "retrabalho",
  "garantia",
  "campanha",
  "cortesia",
  "ajuste_operacional",
  "outro",
] as const;

export type DescontoTipo = (typeof DESCONTO_TIPOS)[number];

export const DESCONTO_TIPO_LABELS: Record<DescontoTipo, string> = {
  fidelizacao: "Fidelização",
  cliente_recorrente: "Cliente recorrente",
  negociacao_comercial: "Negociação comercial",
  retrabalho: "Retrabalho",
  garantia: "Garantia",
  campanha: "Campanha",
  cortesia: "Cortesia",
  ajuste_operacional: "Ajuste operacional",
  outro: "Outro",
};

export const DESCONTO_CARGOS = [
  "membro",
  "supervisor_operacao",
  "gerente_operacao",
  "admin",
  "owner",
] as const;

export type DescontoCargo = (typeof DESCONTO_CARGOS)[number];

/** Mapeia role do tenant_members para cargo de alçada. */
export function roleToDescontoCargo(role: TenantRole): DescontoCargo {
  switch (role) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "manager":
      return "gerente_operacao";
    default:
      return "membro";
  }
}
