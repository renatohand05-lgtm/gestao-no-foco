/**
 * Sprint 21.1 — Catálogo único de permissões (modulo.acao).
 * Fonte tipada · sem strings manuais espalhadas.
 */

import type {
  Permission,
  PermissionCategory,
  PermissionModule,
  PermissionRisk,
} from "./types.ts";

function def<K extends string>(
  key: K,
  module: PermissionModule,
  action: string,
  description: string,
  category: PermissionCategory,
  risk: PermissionRisk,
): Permission & { key: K } {
  return { key, module, action, description, category, risk };
}

/** Catálogo canônico — ordem estável por módulo. */
export const PERMISSION_CATALOG = [
  // Financeiro
  def("financeiro.visualizar", "financeiro", "visualizar", "Visualizar módulo financeiro", "leitura", "baixo"),
  def("financeiro.criar", "financeiro", "criar", "Criar lançamentos financeiros", "escrita", "medio"),
  def("financeiro.editar", "financeiro", "editar", "Editar lançamentos financeiros", "escrita", "medio"),
  def("financeiro.excluir", "financeiro", "excluir", "Excluir lançamentos financeiros", "exclusao", "alto"),
  def("financeiro.arquivar", "financeiro", "arquivar", "Arquivar contas e cadastros financeiros", "exclusao", "alto"),
  def("financeiro.aprovar", "financeiro", "aprovar", "Aprovar operações financeiras", "aprovacao", "alto"),
  def("financeiro.exportar", "financeiro", "exportar", "Exportar dados financeiros", "exportacao", "medio"),
  def("financeiro.conciliar", "financeiro", "conciliar", "Conciliar contas bancárias", "escrita", "alto"),
  def("financeiro.transferir", "financeiro", "transferir", "Transferir entre contas", "escrita", "alto"),
  def("financeiro.ver_saldos", "financeiro", "ver_saldos", "Visualizar saldos bancários", "financeiro_sensivel", "alto"),
  def("financeiro.ver_dre", "financeiro", "ver_dre", "Visualizar DRE", "financeiro_sensivel", "alto"),
  def("financeiro.ver_fluxo_caixa", "financeiro", "ver_fluxo_caixa", "Visualizar fluxo de caixa", "financeiro_sensivel", "alto"),
  def("financeiro.movimentacoes.visualizar", "financeiro", "movimentacoes.visualizar", "Visualizar histórico de movimentações", "leitura", "baixo"),
  def("financeiro.contas.visualizar", "financeiro", "contas.visualizar", "Visualizar contas bancárias e posição de caixa", "leitura", "baixo"),
  def("financeiro.alertas.visualizar", "financeiro", "alertas.visualizar", "Visualizar alertas financeiros", "leitura", "medio"),
  def("financeiro.tributos.visualizar", "financeiro", "tributos.visualizar", "Visualizar Inteligência Tributária Enterprise", "financeiro_sensivel", "alto"),
  def("financeiro.tributos.simular", "financeiro", "tributos.simular", "Simular cenários tributários", "financeiro_sensivel", "alto"),
  def("financeiro.tributos.configurar", "financeiro", "tributos.configurar", "Configurar regras tributárias versionadas", "aprovacao", "critico"),
  def("financeiro.orcamento.visualizar", "financeiro", "orcamento_visualizar", "Visualizar orçamento empresarial", "financeiro_sensivel", "alto"),
  def("financeiro.orcamento.criar", "financeiro", "orcamento_criar", "Criar orçamento empresarial", "escrita", "alto"),
  def("financeiro.orcamento.editar", "financeiro", "orcamento_editar", "Editar orçamento empresarial", "escrita", "alto"),
  def("financeiro.orcamento.aprovar", "financeiro", "orcamento_aprovar", "Aprovar orçamento empresarial", "aprovacao", "critico"),
  def("financeiro.aging.visualizar", "financeiro", "aging_visualizar", "Visualizar aging de inadimplência", "financeiro_sensivel", "alto"),
  def("financeiro.cfo.visualizar", "financeiro", "cfo_visualizar", "Dashboard CFO", "financeiro_sensivel", "alto"),

  // Estoque
  def("estoque.visualizar", "estoque", "visualizar", "Visualizar estoque", "leitura", "baixo"),
  def("estoque.criar", "estoque", "criar", "Criar itens de estoque", "escrita", "medio"),
  def("estoque.editar", "estoque", "editar", "Editar itens de estoque", "escrita", "medio"),
  def("estoque.excluir", "estoque", "excluir", "Excluir itens de estoque", "exclusao", "alto"),
  def("estoque.movimentar", "estoque", "movimentar", "Movimentar estoque", "escrita", "medio"),
  def("estoque.ajustar", "estoque", "ajustar", "Ajustar saldos de estoque", "escrita", "alto"),
  def("estoque.inventariar", "estoque", "inventariar", "Executar inventário", "escrita", "medio"),
  def("estoque.transferir", "estoque", "transferir", "Transferir estoque entre depósitos/localizações", "escrita", "medio"),
  def("estoque.importar", "estoque", "importar", "Importar produtos, saldo e catálogo de estoque", "escrita", "alto"),
  def("estoque.aprovar_ajuste", "estoque", "aprovar_ajuste", "Aprovar ajustes de estoque", "aprovacao", "alto"),
  def("estoque.ver_custo", "estoque", "ver_custo", "Visualizar custo de estoque", "financeiro_sensivel", "alto"),
  def("estoque.exportar", "estoque", "exportar", "Exportar dados de estoque", "exportacao", "baixo"),

  // Produtos / Serviços (Sprint 25.3)
  def("produtos.visualizar", "estoque", "produtos_visualizar", "Visualizar produtos e serviços", "leitura", "baixo"),
  def("produtos.criar", "estoque", "produtos_criar", "Criar produtos e serviços", "escrita", "medio"),
  def("produtos.editar", "estoque", "produtos_editar", "Editar produtos e serviços", "escrita", "medio"),
  def("produtos.excluir", "estoque", "produtos_excluir", "Excluir produtos sem uso", "exclusao", "alto"),
  def("produtos.importar", "estoque", "produtos_importar", "Importar catálogo de produtos", "escrita", "alto"),
  def("servicos.importar", "estoque", "servicos_importar", "Importar catálogo de serviços", "escrita", "alto"),
  def("servicos.excluir", "estoque", "servicos_excluir", "Excluir serviços sem uso", "exclusao", "alto"),
  def("importacoes.visualizar", "estoque", "importacoes_visualizar", "Visualizar histórico de importações", "leitura", "baixo"),
  def("importacoes.rollback", "estoque", "importacoes_rollback", "Reverter importações de catálogo/estoque", "aprovacao", "critico"),
  def("importacoes.arquivar", "estoque", "importacoes_arquivar", "Arquivar histórico de importações", "escrita", "medio"),
  def("importacoes.excluir_historico", "estoque", "importacoes_excluir_historico", "Ocultar/soft-delete do histórico visual", "exclusao", "alto"),

  // Compras
  def("compras.visualizar", "compras", "visualizar", "Visualizar compras", "leitura", "baixo"),
  def("compras.criar", "compras", "criar", "Criar pedidos de compra", "escrita", "medio"),
  def("compras.editar", "compras", "editar", "Editar pedidos de compra", "escrita", "medio"),
  def("compras.excluir", "compras", "excluir", "Excluir pedidos de compra", "exclusao", "alto"),
  def("compras.aprovar", "compras", "aprovar", "Aprovar pedidos de compra", "aprovacao", "alto"),
  def("compras.receber", "compras", "receber", "Receber mercadorias", "escrita", "medio"),
  def("compras.cancelar", "compras", "cancelar", "Cancelar pedidos de compra", "escrita", "alto"),

  // Fornecedores (cadastro reutilizado — chaves explícitas Sprint 25.1)
  def("fornecedores.visualizar", "compras", "fornecedores_visualizar", "Visualizar fornecedores", "leitura", "baixo"),
  def("fornecedores.criar", "compras", "fornecedores_criar", "Criar fornecedores", "escrita", "medio"),
  def("fornecedores.editar", "compras", "fornecedores_editar", "Editar fornecedores", "escrita", "medio"),

  // Supply Chain Enterprise (dashboard / configuração)
  def("supply.dashboard.visualizar", "compras", "supply_dashboard", "Dashboard Supply Chain Enterprise", "leitura", "medio"),
  def("supply.configurar", "compras", "supply_configurar", "Configurar Supply Chain Enterprise", "administracao", "alto"),

  // Vendas
  def("vendas.visualizar", "vendas", "visualizar", "Visualizar vendas", "leitura", "baixo"),
  def("vendas.criar", "vendas", "criar", "Criar vendas", "escrita", "medio"),
  def("vendas.editar", "vendas", "editar", "Editar vendas", "escrita", "medio"),
  def("vendas.excluir", "vendas", "excluir", "Excluir vendas", "exclusao", "alto"),
  def("vendas.aprovar_desconto", "vendas", "aprovar_desconto", "Aprovar descontos", "aprovacao", "alto"),
  def("vendas.cancelar", "vendas", "cancelar", "Cancelar vendas", "escrita", "alto"),
  def("vendas.exportar", "vendas", "exportar", "Exportar vendas", "exportacao", "baixo"),

  // OS
  def("os.visualizar", "os", "visualizar", "Visualizar ordens de serviço", "leitura", "baixo"),
  def("os.criar", "os", "criar", "Criar ordens de serviço", "escrita", "medio"),
  def("os.editar", "os", "editar", "Editar ordens de serviço", "escrita", "medio"),
  def("os.excluir", "os", "excluir", "Excluir ordens de serviço", "exclusao", "alto"),
  def("os.aprovar", "os", "aprovar", "Aprovar ordens de serviço", "aprovacao", "alto"),
  def("os.cancelar", "os", "cancelar", "Cancelar ordens de serviço", "escrita", "alto"),
  def("os.finalizar", "os", "finalizar", "Finalizar ordens de serviço", "escrita", "medio"),
  def("os.reabrir", "os", "reabrir", "Reabrir ordens de serviço", "escrita", "alto"),
  def("os.ver_custo", "os", "ver_custo", "Visualizar custo de OS", "financeiro_sensivel", "alto"),
  def("os.ver_margem", "os", "ver_margem", "Visualizar margem de OS", "financeiro_sensivel", "alto"),
  def("os.templates.configurar", "os", "templates_configurar", "Configurar templates de Ordem de Trabalho", "administracao", "alto"),

  // CRM
  def("crm.visualizar", "crm", "visualizar", "Visualizar CRM", "leitura", "baixo"),
  def("crm.criar", "crm", "criar", "Criar registros de CRM", "escrita", "medio"),
  def("crm.editar", "crm", "editar", "Editar registros de CRM", "escrita", "medio"),
  def("crm.excluir", "crm", "excluir", "Excluir registros de CRM", "exclusao", "alto"),
  def("crm.exportar", "crm", "exportar", "Exportar dados de CRM", "exportacao", "medio"),
  def("crm.ver_dados_sensiveis", "crm", "ver_dados_sensiveis", "Visualizar dados sensíveis de clientes", "dados_sensiveis", "critico"),
  def("crm.pipeline.visualizar", "crm", "pipeline_visualizar", "Visualizar pipeline CRM", "leitura", "baixo"),
  def("crm.pipeline.configurar", "crm", "pipeline_configurar", "Configurar etapas do pipeline CRM", "administracao", "alto"),
  def("crm.oportunidades.criar", "crm", "oportunidades_criar", "Criar oportunidades CRM", "escrita", "medio"),
  def("crm.oportunidades.editar", "crm", "oportunidades_editar", "Editar oportunidades CRM", "escrita", "medio"),
  def("crm.atividades.criar", "crm", "atividades_criar", "Criar atividades CRM", "escrita", "medio"),
  def("crm.atividades.editar", "crm", "atividades_editar", "Editar atividades CRM", "escrita", "medio"),
  def("crm.dashboard.visualizar", "crm", "dashboard_visualizar", "Dashboard executivo CRM", "leitura", "medio"),
  def("crm.configurar", "crm", "configurar", "Configurar CRM (etapas e preferências)", "administracao", "alto"),
  def("crm.converter", "crm", "converter", "Converter lead/oportunidade (cliente, orçamento, OS)", "escrita", "alto"),
  def("crm.ver_todos_responsaveis", "crm", "ver_todos_responsaveis", "Ver pipeline de todos os responsáveis", "leitura", "alto"),
  // Alias clientes.* → mesmo módulo CRM (cadastro único)
  def("clientes.visualizar", "crm", "clientes_visualizar", "Visualizar cadastro de clientes", "leitura", "baixo"),
  def("clientes.criar", "crm", "clientes_criar", "Criar clientes", "escrita", "medio"),
  def("clientes.editar", "crm", "clientes_editar", "Editar clientes", "escrita", "medio"),
  def("clientes.excluir", "crm", "clientes_excluir", "Excluir clientes", "exclusao", "alto"),

  // Agenda Enterprise (Fase 28.5)
  def("agenda.visualizar", "agenda", "visualizar", "Visualizar agenda", "leitura", "baixo"),
  def("agenda.criar", "agenda", "criar", "Criar eventos na agenda", "escrita", "medio"),
  def("agenda.editar", "agenda", "editar", "Editar eventos na agenda", "escrita", "medio"),
  def("agenda.excluir", "agenda", "excluir", "Excluir eventos na agenda", "exclusao", "alto"),
  def("agenda.sobrescrever_conflito", "agenda", "sobrescrever_conflito", "Sobrescrever conflito de agenda com justificativa", "aprovacao", "alto"),

  // Dashboard
  def("dashboard.executivo", "dashboard", "executivo", "Acessar dashboard executivo", "leitura", "medio"),
  def("dashboard.financeiro", "dashboard", "financeiro", "Acessar dashboard financeiro", "leitura", "medio"),
  def("dashboard.operacional", "dashboard", "operacional", "Acessar dashboard operacional", "leitura", "baixo"),
  def("dashboard.comercial", "dashboard", "comercial", "Acessar dashboard comercial", "leitura", "baixo"),
  def("dashboard.estoque", "dashboard", "estoque", "Acessar dashboard de estoque", "leitura", "baixo"),
  def("dashboard.rh", "dashboard", "rh", "Acessar dashboard de RH", "leitura", "medio"),
  def("dashboard.exportar", "dashboard", "exportar", "Exportar dashboards", "exportacao", "medio"),

  // Analytics / BI (Fase 23)
  def("analytics.visualizar", "analytics", "visualizar", "Visualizar Analytics Enterprise", "leitura", "medio"),
  def("analytics.executivo", "analytics", "executivo", "Dashboard executivo de Analytics", "leitura", "medio"),
  def("analytics.financeiro", "analytics", "financeiro", "Analytics financeiro", "financeiro_sensivel", "alto"),
  def("analytics.vendas", "analytics", "vendas", "Analytics comercial", "leitura", "medio"),
  def("analytics.operacional", "analytics", "operacional", "Analytics operacional e clientes", "leitura", "medio"),
  def("analytics.estoque", "analytics", "estoque", "Analytics de estoque", "leitura", "medio"),
  def("analytics.tributario", "analytics", "tributario", "Analytics tributário", "financeiro_sensivel", "alto"),
  def("analytics.configurar", "analytics", "configurar", "Configurar dashboards Analytics", "administracao", "alto"),
  def("analytics.exportar", "analytics", "exportar", "Exportar Analytics", "exportacao", "medio"),

  // Inteligência Enterprise (Fase 27)
  def("inteligencia.visualizar", "inteligencia", "visualizar", "Visualizar Inteligência Enterprise", "leitura", "medio"),
  def("inteligencia.executivo", "inteligencia", "executivo", "Copiloto e briefing executivo", "leitura", "alto"),
  def("inteligencia.perguntar", "inteligencia", "perguntar", "Perguntar ao Copiloto", "leitura", "alto"),
  def("inteligencia.explicar", "inteligencia", "explicar", "Solicitar explicações (DRE, métricas)", "leitura", "alto"),
  def("inteligencia.simular", "inteligencia", "simular", "Executar simulações", "escrita", "alto"),
  def("inteligencia.recomendar", "inteligencia", "recomendar", "Receber recomendações", "leitura", "medio"),
  def("inteligencia.criar_plano", "inteligencia", "criar_plano", "Criar planos de ação (rascunho)", "escrita", "alto"),
  def("inteligencia.aprovar_plano", "inteligencia", "aprovar_plano", "Aprovar planos de ação", "aprovacao", "critico"),
  def("inteligencia.executar_acao", "inteligencia", "executar_acao", "Executar ações aprovadas", "aprovacao", "critico"),
  def("inteligencia.configurar_provider", "inteligencia", "configurar_provider", "Configurar providers de inteligência", "administracao", "critico"),
  def("inteligencia.ver_auditoria", "inteligencia", "ver_auditoria", "Ver auditoria de inteligência", "leitura", "alto"),
  def("inteligencia.ver_custos", "inteligencia", "ver_custos", "Ver custos/uso de inteligência", "financeiro_sensivel", "alto"),
  def("inteligencia.feedback", "inteligencia", "feedback", "Enviar feedback sobre respostas", "escrita", "baixo"),

  // Automações Enterprise (Fase 30.7) — novas permissões; não altera as existentes
  def("automacoes.visualizar", "automacoes", "visualizar", "Visualizar Central de Automações", "leitura", "medio"),
  def("automacoes.criar", "automacoes", "criar", "Criar regras de automação", "escrita", "alto"),
  def("automacoes.editar", "automacoes", "editar", "Editar regras de automação", "escrita", "alto"),
  def("automacoes.ativar", "automacoes", "ativar", "Ativar regras de automação", "aprovacao", "critico"),
  def("automacoes.pausar", "automacoes", "pausar", "Pausar regras de automação", "escrita", "alto"),
  def("automacoes.arquivar", "automacoes", "arquivar", "Arquivar regras de automação", "exclusao", "alto"),
  def("automacoes.simular", "automacoes", "simular", "Simular / dry-run de automações", "leitura", "alto"),
  def("automacoes.executar", "automacoes", "executar", "Executar automações aprovadas", "aprovacao", "critico"),
  def("automacoes.aprovar", "automacoes", "aprovar", "Aprovar execuções de automação", "aprovacao", "critico"),
  def("automacoes.ver_historico", "automacoes", "ver_historico", "Ver histórico de execuções", "leitura", "medio"),
  def("automacoes.ver_auditoria", "automacoes", "ver_auditoria", "Ver auditoria de automações", "leitura", "alto"),
  def("automacoes.administrar", "automacoes", "administrar", "Administrar Central de Automações", "administracao", "critico"),

  // Tributário Enterprise (Fase 26.8+)
  def("tax.visualizar", "tax", "visualizar", "Visualizar hub tributário", "leitura", "alto"),
  def("tax.executivo", "tax", "executivo", "Cockpit tributário executivo", "financeiro_sensivel", "alto"),
  def("tax.configurar", "tax", "configurar", "Configurar tributário", "administracao", "critico"),
  def("tax.criar_regra", "tax", "criar_regra", "Criar regras tributárias", "escrita", "critico"),
  def("tax.editar_draft", "tax", "editar_draft", "Editar drafts tributários", "escrita", "alto"),
  def("tax.revisar", "tax", "revisar", "Revisar regras tributárias", "aprovacao", "alto"),
  def("tax.aprovar", "tax", "aprovar", "Aprovar regras tributárias", "aprovacao", "critico"),
  def("tax.publicar", "tax", "publicar", "Publicar regras tributárias", "aprovacao", "critico"),
  def("tax.suspender", "tax", "suspender", "Suspender regras publicadas", "aprovacao", "critico"),
  def("tax.versionar", "tax", "versionar", "Versionar regras tributárias", "escrita", "alto"),
  def("tax.simular", "tax", "simular", "Simular cenários tributários", "financeiro_sensivel", "alto"),
  def("tax.comparar_regimes", "tax", "comparar_regimes", "Comparar regimes tributários", "financeiro_sensivel", "alto"),
  def("tax.ver_auditoria", "tax", "ver_auditoria", "Ver auditoria tributária", "leitura", "alto"),
  def("tax.exportar", "tax", "exportar", "Exportar relatórios tributários", "exportacao", "alto"),
  def("tax.configurar_integracao", "tax", "configurar_integracao", "Configurar integrações fiscais", "administracao", "critico"),

  // Usuários
  def("usuarios.visualizar", "usuarios", "visualizar", "Visualizar usuários", "leitura", "medio"),
  def("usuarios.criar", "usuarios", "criar", "Criar usuários", "administracao", "alto"),
  def("usuarios.editar", "usuarios", "editar", "Editar usuários", "administracao", "alto"),
  def("usuarios.desativar", "usuarios", "desativar", "Desativar usuários", "administracao", "alto"),
  def("usuarios.excluir", "usuarios", "excluir", "Excluir usuários", "exclusao", "critico"),
  def("usuarios.atribuir_role", "usuarios", "atribuir_role", "Atribuir papéis a usuários", "administracao", "critico"),
  def("usuarios.atribuir_permissao", "usuarios", "atribuir_permissao", "Atribuir permissões a usuários", "administracao", "critico"),

  // Configurações
  def("configuracoes.visualizar", "configuracoes", "visualizar", "Visualizar configurações", "leitura", "medio"),
  def("configuracoes.editar", "configuracoes", "editar", "Editar configurações do tenant", "administracao", "alto"),
  def("configuracoes.integracoes", "configuracoes", "integracoes", "Gerenciar integrações", "administracao", "alto"),
  def("configuracoes.faturamento", "configuracoes", "faturamento", "Gerenciar faturamento", "administracao", "critico"),
  def("configuracoes.tenant", "configuracoes", "tenant", "Administrar tenant", "administracao", "critico"),

  // Auditoria
  def("auditoria.visualizar", "auditoria", "visualizar", "Visualizar auditoria", "leitura", "medio"),
  def("auditoria.exportar", "auditoria", "exportar", "Exportar auditoria", "exportacao", "alto"),

  // Relatórios
  def("relatorios.visualizar", "relatorios", "visualizar", "Visualizar relatórios", "leitura", "baixo"),
  def("relatorios.criar", "relatorios", "criar", "Criar relatórios", "escrita", "medio"),
  def("relatorios.exportar", "relatorios", "exportar", "Exportar relatórios", "exportacao", "medio"),
  def("relatorios.agendar", "relatorios", "agendar", "Agendar relatórios", "escrita", "medio"),
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

/** Constantes nomeadas — evita strings literais no código consumidor. */
export const P = Object.fromEntries(
  PERMISSION_CATALOG.map((p) => [p.key.replace(/\./g, "_").toUpperCase(), p.key]),
) as Record<string, PermissionKey>;

/** Mapa key → metadados. */
export const PERMISSION_BY_KEY: ReadonlyMap<string, Permission> = new Map(
  PERMISSION_CATALOG.map((p) => [p.key, p]),
);

/** Todas as chaves do catálogo (ordem estável). */
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] =
  PERMISSION_CATALOG.map((p) => p.key);

/** Agrupamento por módulo. */
export const PERMISSIONS_BY_MODULE: Readonly<
  Record<PermissionModule, readonly Permission[]>
> = PERMISSION_CATALOG.reduce(
  (acc, perm) => {
    const list = acc[perm.module] ?? [];
    (acc as Record<PermissionModule, Permission[]>)[perm.module] = [
      ...list,
      perm,
    ];
    return acc;
  },
  {} as Record<PermissionModule, Permission[]>,
);

export function isKnownPermission(key: string): key is PermissionKey {
  return PERMISSION_BY_KEY.has(key);
}

export function getPermission(key: string): Permission | undefined {
  return PERMISSION_BY_KEY.get(key);
}

export function listPermissionsByModule(
  module: PermissionModule,
): readonly Permission[] {
  return PERMISSIONS_BY_MODULE[module] ?? [];
}
