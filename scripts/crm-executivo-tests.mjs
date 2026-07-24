#!/usr/bin/env node
/**
 * Testes — Central Inteligente de Clientes / CRM Executivo (Gate 18.2)
 */
import {
  CRM_EXEC_INATIVO_DIAS,
  CRM_EXEC_RANKING_KEYS,
  classifyCrmExecSegmento,
  composeCrmExecKpis,
  composeCrmExecOportunidades,
  composeCrmExecPerfil,
  composeCrmExecPortfolio,
  composeCrmExecRanking,
  composeCrmExecRiscos,
  crmExecCentralHref,
  recommendCrmExecAction,
  resolveCrmExecRankingKey,
} from "../lib/crm/crm-executivo-compose.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nCRM Executivo — Gate 18.2\n");

const now = new Date("2026-07-20T15:00:00.000Z");

function cliente(partial) {
  return {
    id: "c1",
    nome: "Cliente Teste",
    telefone: "11999990000",
    whatsapp: null,
    ativo: true,
    created_at: "2025-01-10T10:00:00.000Z",
    ...partial,
  };
}

function os(partial) {
  return {
    id: "os1",
    cliente_id: "c1",
    status: "faturado",
    created_at: "2026-06-01T10:00:00.000Z",
    valor_total: 500,
    ...partial,
  };
}

function venda(partial) {
  return {
    id: "v1",
    cliente_id: "c1",
    status: "faturado",
    total: 300,
    created_at: "2026-05-01T10:00:00.000Z",
    data_venda: "2026-05-01",
    ...partial,
  };
}

// --- Segmentação ---
console.log("Segmentação");
{
  assert(
    classifyCrmExecSegmento({
      faturamento: 12_000,
      visitas: 5,
      ticketMedio: 600,
      recorrente: true,
    }) === "VIP",
    "VIP por faturamento + visitas + ticket",
  );
  assert(
    classifyCrmExecSegmento({
      faturamento: 100,
      visitas: 1,
      ticketMedio: 100,
      recorrente: false,
      hasVipTag: true,
    }) === "VIP",
    "VIP por tag",
  );
  assert(
    classifyCrmExecSegmento({
      faturamento: 6_000,
      visitas: 3,
      ticketMedio: 400,
      recorrente: true,
    }) === "Ouro",
    "Ouro por faturamento + visitas",
  );
  assert(
    classifyCrmExecSegmento({
      faturamento: 2_000,
      visitas: 2,
      ticketMedio: 200,
      recorrente: false,
    }) === "Prata",
    "Prata por faturamento + visitas",
  );
  assert(
    classifyCrmExecSegmento({
      faturamento: 100,
      visitas: 2,
      ticketMedio: 50,
      recorrente: true,
    }) === "Prata",
    "Prata por recorrência",
  );
  assert(
    classifyCrmExecSegmento({
      faturamento: 100,
      visitas: 1,
      ticketMedio: 100,
      recorrente: false,
    }) === "Bronze",
    "Bronze padrão",
  );
}

// --- Portfolio fixture ---
const portfolioInput = {
  now,
  clientes: [
    cliente({ id: "vip1", nome: "VIP Ativo" }),
    cliente({
      id: "risco1",
      nome: "Inativo 180",
      created_at: "2024-01-01T00:00:00.000Z",
    }),
    cliente({
      id: "novo1",
      nome: "Novo Mês",
      created_at: "2026-07-05T00:00:00.000Z",
    }),
    cliente({ id: "frota1", nome: "Frota" }),
    cliente({ id: "rec1", nome: "Recorrente sumido" }),
  ],
  ordens: [
    os({
      id: "a",
      cliente_id: "vip1",
      status: "faturado",
      valor_total: 4_000,
      created_at: "2026-07-01T10:00:00.000Z",
    }),
    os({
      id: "b",
      cliente_id: "vip1",
      status: "faturado",
      valor_total: 3_500,
      created_at: "2026-06-01T10:00:00.000Z",
    }),
    os({
      id: "c",
      cliente_id: "vip1",
      status: "faturado",
      valor_total: 3_000,
      created_at: "2026-05-01T10:00:00.000Z",
    }),
    os({
      id: "d",
      cliente_id: "vip1",
      status: "faturado",
      valor_total: 2_500,
      created_at: "2026-04-01T10:00:00.000Z",
    }),
    os({
      id: "e",
      cliente_id: "risco1",
      status: "faturado",
      valor_total: 200,
      created_at: "2025-01-01T10:00:00.000Z",
    }),
    os({
      id: "f",
      cliente_id: "frota1",
      status: "aguardando_aprovacao",
      valor_total: 1_200,
      created_at: "2026-07-10T10:00:00.000Z",
    }),
    os({
      id: "g",
      cliente_id: "frota1",
      status: "aprovado",
      valor_total: 800,
      created_at: "2026-07-11T10:00:00.000Z",
    }),
    os({
      id: "h",
      cliente_id: "rec1",
      status: "faturado",
      valor_total: 400,
      created_at: "2026-03-01T10:00:00.000Z",
    }),
    os({
      id: "i",
      cliente_id: "rec1",
      status: "faturado",
      valor_total: 450,
      created_at: "2026-03-20T10:00:00.000Z",
    }),
  ],
  vendas: [
    venda({
      id: "v-vip",
      cliente_id: "vip1",
      total: 1_000,
      created_at: "2026-03-01T10:00:00.000Z",
      data_venda: "2026-03-01",
    }),
  ],
  veiculos: [
    { id: "ve1", cliente_id: "frota1" },
    { id: "ve2", cliente_id: "frota1" },
    { id: "ve3", cliente_id: "frota1" },
    { id: "ve4", cliente_id: "vip1" },
  ],
  tarefas: [
    {
      id: "t1",
      cliente_id: "risco1",
      tipo: "revisao",
      status: "pendente",
      data_vencimento: "2026-06-01",
      titulo: "Revisão atrasada",
    },
    {
      id: "t2",
      cliente_id: "vip1",
      tipo: "revisao",
      status: "pendente",
      data_vencimento: "2026-07-25",
      titulo: "Revisão próxima",
    },
  ],
  agendamentos: [
    {
      id: "ag1",
      cliente_id: "frota1",
      tipo: "retorno",
      status: "agendado",
      inicio: "2026-07-15T10:00:00.000Z",
      titulo: "Retorno",
    },
  ],
  tags: [{ entity_id: "vip1", nome: "VIP" }],
};

const portfolio = composeCrmExecPortfolio(portfolioInput);

// --- KPIs ---
console.log("\nKPIs");
{
  const k = portfolio.kpis;
  assert(k.clientesNovosMes === 1, "novos no mês");
  assert(k.clientesInativos180 >= 1, "inativos >180");
  assert(k.clientesRecorrentes >= 1, "recorrentes");
  assert(k.totalGastoLifetime > 0, "lifetime > 0");
  assert(k.ticketMedioPorCliente > 0, "ticket médio por cliente");
  assert(k.faturamentoPorCliente > 0, "faturamento por cliente");
  assert(k.mediaVisitas > 0, "média de visitas");
  assert(k.ultimaVisitaCarteira != null, "última visita carteira");
  assert(k.proximaRevisaoPrevista === "2026-07-25", "próxima revisão prevista");
  assert(typeof k.clientesAtivos === "number", "clientes ativos numérico");
}

// --- Rankings ---
console.log("\nRankings");
{
  assert(CRM_EXEC_RANKING_KEYS.length === 5, "5 chaves de ranking");
  assert(resolveCrmExecRankingKey("veiculos") === "veiculos", "resolve ranking");
  assert(resolveCrmExecRankingKey("x") === "faturamento", "fallback ranking");

  const byFat = composeCrmExecRanking(portfolio.intel, "faturamento", 10);
  assert(byFat[0]?.id === "vip1", "top faturamento = VIP");

  const byVeic = composeCrmExecRanking(portfolio.intel, "veiculos", 10);
  assert(byVeic[0]?.id === "frota1", "top veículos = frota");

  const byServ = composeCrmExecRanking(portfolio.intel, "servicos", 10);
  assert(byServ[0]?.servicos >= byServ[1]?.servicos || byServ.length === 1, "serviços ordenados");

  assert(portfolio.rankings.ticket.length <= 10, "top 10 limite");
}

// --- Riscos ---
console.log("\nClientes em risco");
{
  const riscos = composeCrmExecRiscos(portfolio.intel);
  const motivos = new Set(riscos.map((r) => r.motivo));
  assert(motivos.has("sem_retorno_180"), "risco 180 dias");
  assert(motivos.has("orcamento_aguardando"), "risco orçamento aguardando");
  assert(motivos.has("orcamento_aprovado_sem_os"), "risco aprovado sem OS");
  assert(motivos.has("revisao_vencida"), "risco revisão vencida");
  assert(motivos.has("retorno_pendente"), "risco retorno pendente");
  assert(
    riscos.every(
      (r) =>
        r.nome &&
        r.motivoLabel &&
        r.acaoRecomendada &&
        typeof r.valorPotencial === "number",
    ),
    "risco campos obrigatórios",
  );
}

// --- Oportunidades ---
console.log("\nOportunidades");
{
  const ops = composeCrmExecOportunidades(portfolio.intel, now);
  const tipos = new Set(ops.map((o) => o.tipo));
  assert(tipos.has("orcamento_aguardando"), "opp orçamento");
  assert(tipos.has("revisao_proxima") || tipos.has("revisao_vencida"), "opp revisão");
  assert(tipos.has("varios_veiculos"), "opp vários veículos");
  assert(tipos.has("recorrente_sem_visita"), "opp recorrente sem visita");
  assert(
    ops.every((o) => o.tipoLabel && o.acaoRecomendada && o.clienteId),
    "opp campos",
  );
}

// --- Perfil ---
console.log("\nPerfil executivo");
{
  const perfil = composeCrmExecPerfil({
    now,
    cliente: cliente({ id: "vip1", nome: "VIP Ativo" }),
    ordens: portfolioInput.ordens.filter((o) => o.cliente_id === "vip1"),
    vendas: portfolioInput.vendas.filter((v) => v.cliente_id === "vip1"),
    veiculos: portfolioInput.veiculos.filter((v) => v.cliente_id === "vip1"),
    tarefas: portfolioInput.tarefas.filter((t) => t.cliente_id === "vip1"),
    agendamentos: [],
    tags: ["VIP"],
    financeiro: [
      {
        id: "cr1",
        descricao: "Parcela OS",
        valor_original: 500,
        status: "aberto",
        data_vencimento: "2026-08-01",
      },
    ],
    itensServico: [{ descricao: "Troca de óleo", quantidade: 3 }],
    itensPeca: [{ descricao: "Filtro", quantidade: 2 }],
  });

  assert(perfil.segmento === "VIP", "perfil segmento VIP");
  assert(perfil.faturamentoTotal > 0, "perfil faturamento");
  assert(perfil.quantidadeOs === 4, "perfil qtd OS");
  assert(perfil.ticketMedio > 0, "perfil ticket");
  assert(perfil.ultimaVisita != null, "perfil última visita");
  assert(perfil.primeiraVisita != null, "perfil primeira visita");
  assert(perfil.veiculos === 1, "perfil veículos");
  assert(perfil.servicosMaisFrequentes[0]?.descricao === "Troca de óleo", "serviços freq");
  assert(perfil.pecasMaisCompradas[0]?.descricao === "Filtro", "peças freq");
  assert(perfil.evolucaoMensal.length > 0, "evolução mensal");
  assert(perfil.historicoFinanceiro.length === 1, "histórico financeiro");
  assert(perfil.acoesRecomendadas.length > 0, "ações perfil");
  assert(perfil.proximaRevisao === "2026-07-25", "perfil próxima revisão");
}

// --- Regras de ação ---
console.log("\nRegras");
{
  assert(
    recommendCrmExecAction({ orcamentoAguardando: true }) ===
      "Enviar orçamento.",
    "ação enviar orçamento",
  );
  assert(
    recommendCrmExecAction({ motivo: "revisao_vencida" }) ===
      "Agendar revisão.",
    "ação agendar revisão",
  );
  assert(
    recommendCrmExecAction({ motivo: "sem_retorno_180" }) ===
      "Ligar para cliente.",
    "ação ligar",
  );
  assert(
    recommendCrmExecAction({ motivo: "recorrente_sem_visita" }) ===
      "Oferecer troca de óleo.",
    "ação troca de óleo",
  );
  assert(
    recommendCrmExecAction({ motivo: "varios_veiculos" }) ===
      "Cliente pronto para fidelização.",
    "ação fidelização",
  );
  assert(
    recommendCrmExecAction({ motivo: "orcamento_aprovado_sem_os" }) ===
      "Abrir OS e agendar execução.",
    "ação abrir OS",
  );
  assert(CRM_EXEC_INATIVO_DIAS === 180, "limiar inativo 180");
}

// --- Responsividade / href ---
console.log("\nResponsividade (contratos de UI)");
{
  assert(
    crmExecCentralHref("demo") === "/demo/clientes/central",
    "href central default",
  );
  assert(
    crmExecCentralHref("demo", "ticket") ===
      "/demo/clientes/central?ranking=ticket",
    "href ranking query",
  );
  assert(
    composeCrmExecKpis([]).clientesAtivos === 0,
    "KPIs vazios seguros",
  );
  assert(
    composeCrmExecRanking([], "faturamento").length === 0,
    "ranking vazio seguro",
  );
  // cards/tabelas: chaves de ranking estáveis para troca rápida
  assert(
    CRM_EXEC_RANKING_KEYS.every((k) => typeof portfolio.rankings[k] !== "undefined"),
    "rankings pré-computados para troca rápida",
  );
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
