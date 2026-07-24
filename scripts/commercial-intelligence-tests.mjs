#!/usr/bin/env node
/**
 * Testes — Inteligência Comercial (Gate 18.3 / 18.3.1)
 */
import {
  CI_CLIENTE_SEARCH_DEBOUNCE_MS,
  CI_CLIENTE_SEARCH_MIN_CHARS,
  CI_CONVERSAO_FORMULA,
  CI_HISTORICO_ETAPA_MSG,
  CI_ORIGEM_COBERTURA_BAIXA_MSG,
  CI_PIPELINE_STAGES,
  CI_RESPONSAVEL_FALLBACK,
  assertTenantIsolation,
  calcTaxaConversaoComercial,
  ciClearHref,
  ciHref,
  ciResponsavelUiLabel,
  composeCommercialIntelligence,
  isCiOrigemConfiavel,
  matchCiClienteTypeahead,
  resolveCiOrigemLabel,
  resolveCiPeriod,
  resolveCiResponsavel,
  shouldRunCiClienteSearch,
} from "../lib/vendas/commercial-intelligence-compose.ts";

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

function assertFinite(n, msg) {
  assert(typeof n === "number" && Number.isFinite(n) && !Number.isNaN(n), msg);
}

console.log("\nInteligência Comercial — Gate 18.3.1\n");

const now = new Date("2026-07-20T15:00:00.000Z");
const filters = { de: "2026-07-01", ate: "2026-07-20" };

function venda(partial) {
  return {
    id: "v1",
    tenant_id: "t1",
    numero: 1,
    cliente_id: "c1",
    cliente_nome: "Cliente A",
    status: "faturado",
    total: 1000,
    subtotal: 1000,
    desconto_total: 0,
    data_venda: "2026-07-10",
    created_at: "2026-07-10T12:00:00.000Z",
    updated_at: "2026-07-10T12:00:00.000Z",
    vendedor_id: null,
    created_by: null,
    canal_venda: "balcao",
    deleted_at: null,
    ...partial,
  };
}

console.log("Origem");
{
  assert(resolveCiOrigemLabel("os") === "OS", "origem OS");
  assert(resolveCiOrigemLabel("balcao") === "Venda rápida", "origem venda rápida");
  assert(resolveCiOrigemLabel("ecommerce") === "E-commerce", "origem real preservada");
  assert(resolveCiOrigemLabel("padrao") === "Sem origem", "Sem origem (padrao)");
  assert(resolveCiOrigemLabel(null) === "Sem origem", "Sem origem (null)");
  assert(isCiOrigemConfiavel("os") === true, "OS confiável");
  assert(isCiOrigemConfiavel("balcao") === true, "balcao confiável");
  assert(isCiOrigemConfiavel("padrao") === false, "padrao não confiável");
  assert(
    !/indicação|campanha|balcão/i.test(resolveCiOrigemLabel("balcao")),
    "não inventa campanha/indicação/balcão como rótulo",
  );
}

console.log("\nResponsável");
{
  const r1 = resolveCiResponsavel({
    vendedor_id: "vend1",
    responsavel_comercial_id: "rc1",
    created_by: "criador1",
    profileNames: { vend1: "Ana", rc1: "Carla", criador1: "Bruno" },
  });
  assert(r1.origem === "vendedor_id" && r1.confiavel === true, "vendedor confirmado");
  assert(ciResponsavelUiLabel(r1.origem) === "Responsável comercial", "label comercial");

  const r2 = resolveCiResponsavel({
    responsavel_comercial_id: "rc1",
    created_by: "criador1",
    profileNames: { rc1: "Carla", criador1: "Bruno" },
  });
  assert(
    r2.origem === "responsavel_comercial" && r2.confiavel === true,
    "responsável comercial explícito",
  );

  const r3 = resolveCiResponsavel({
    created_by: "criador1",
    profileNames: { criador1: "Bruno" },
  });
  assert(
    r3.origem === "criador_registro" && r3.confiavel === false,
    "created_by como criador",
  );
  assert(ciResponsavelUiLabel(r3.origem) === "Criador do registro", "label criador");

  const r4 = resolveCiResponsavel({});
  assert(
    r4.origem === "fallback" &&
      r4.nome === CI_RESPONSAVEL_FALLBACK &&
      r4.confiavel === false,
    "Não atribuído",
  );
}

const rows = [
  venda({
    id: "os1",
    canal_venda: "os",
    vendedor_id: "vend1",
    created_by: "criador1",
    total: 1000,
    data_venda: "2026-07-05",
    created_at: "2026-07-05T10:00:00.000Z",
    tipo_item_agg: [
      { tipo: "produto", descricao: "Filtro", total: 400, qtd: 2 },
      { tipo: "servico", descricao: "Troca óleo", total: 600, qtd: 1 },
    ],
  }),
  venda({
    id: "rapida1",
    canal_venda: "balcao",
    vendedor_id: "vend1",
    total: 500,
    cliente_id: "c2",
    cliente_nome: "Cliente B",
    data_venda: "2026-07-08",
    created_at: "2026-07-08T10:00:00.000Z",
  }),
  venda({
    id: "hist1",
    canal_venda: "padrao",
    vendedor_id: null,
    created_by: "criador1",
    total: 300,
    cliente_id: null,
    cliente_nome: null,
    data_venda: "2026-07-09",
    created_at: "2026-07-09T10:00:00.000Z",
  }),
  venda({
    id: "ecom1",
    canal_venda: "ecommerce",
    vendedor_id: "vend2",
    total: 200,
    data_venda: "2026-07-11",
    created_at: "2026-07-11T10:00:00.000Z",
  }),
  venda({
    id: "o1",
    status: "orcamento",
    canal_venda: "padrao",
    total: 800,
    data_venda: "2026-07-15",
    created_at: "2026-07-15T10:00:00.000Z",
  }),
  venda({
    id: "cxl",
    status: "cancelado",
    canal_venda: "os",
    total: 400,
    data_venda: "2026-07-12",
    created_at: "2026-07-12T10:00:00.000Z",
  }),
];

const data = composeCommercialIntelligence({
  vendas: rows,
  osOficina: [{ id: "osx", status: "aguardando_aprovacao", valor_total: 700 }],
  filters,
  profileNames: {
    vend1: "Ana Vendedora",
    vend2: "Diego",
    criador1: "Bruno Criador",
  },
  vipClienteIds: ["c1"],
  now,
  meta: {
    available: true,
    valorMeta: 5000,
    realizado: 2000,
    diferenca: -3000,
    percentual: 40,
    projecao: 2800,
    necessarioPorDiaUtil: 400,
    ritmoAtual: 40,
    ritmoEsperado: 60,
    status: "abaixo_do_ritmo",
  },
});

console.log("\nCobertura / rankings separados");
{
  assert(data.cobertura.totalAvaliadas === 4, "4 faturadas avaliadas");
  assert(data.cobertura.comOrigem === 3, "3 com origem (os,balcao,ecommerce)");
  assert(data.cobertura.semOrigem === 1, "1 sem origem");
  assert(data.cobertura.coberturaOrigemPct === 75, "cobertura origem 75%");
  assert(data.cobertura.avisoOrigem == null, "sem aviso acima de 70%");
  assert(data.cobertura.semCliente === 1, "1 sem cliente");
  assert(
    data.cobertura.comResponsavelConfirmado === 3,
    "3 responsáveis confirmados",
  );

  assert(
    data.rankings.responsaveisConfirmados.every((r) =>
      ["Ana Vendedora", "Diego"].includes(r.label),
    ),
    "ranking comercial sem misturar criador",
  );
  assert(
    !data.rankings.responsaveisConfirmados.some((r) =>
      r.label.includes("Bruno"),
    ),
    "criador fora do ranking comercial",
  );
  assert(
    data.rankings.registrosPorCriador.some((r) => r.label === "Bruno Criador"),
    "ranking por criador separado",
  );

  const labels = data.rankings.origens.map((o) => o.label);
  assert(labels.includes("OS"), "ranking tem OS");
  assert(labels.includes("Venda rápida"), "ranking tem Venda rápida");
  assert(labels.includes("Sem origem"), "ranking tem Sem origem");
  assert(labels.includes("E-commerce"), "ranking tem ecommerce");
  assert(new Set(labels).size === labels.length, "sem origem duplicada");
}

console.log("\nKPIs base");
{
  assert(data.kpis.faturamentoPeriodo.value === 2000, "faturamento 2000");
  assert(data.kpis.valorEmNegociacao.value === 800, "negociação");
  assert(data.kpis.valorPerdido.value === 400, "perdido");
  assert(data.kpis.ticketMedio.value === 500, "ticket");
  assertFinite(data.kpis.faturamentoPeriodo.value, "finite fat");
}

console.log("\nConversão / pipeline / histórico");
{
  assert(calcTaxaConversaoComercial({ faturadas: 0, elegiveis: 0 }).available === false, "denominador zero");
  assert(CI_PIPELINE_STAGES.length === 4, "4 etapas");
  assert(data.historicoEtapaMensagem === CI_HISTORICO_ETAPA_MSG, "histórico indisponível");
  assert(
    !JSON.stringify(data.pipeline).includes("tempo médio"),
    "sem métrica de tempo médio",
  );
  assert(
    !JSON.stringify(data.actionItems).toLowerCase().includes("expir"),
    "sem validade inventada",
  );
}

console.log("\nTypeahead");
{
  assert(CI_CLIENTE_SEARCH_MIN_CHARS === 2, "mínimo caracteres");
  assert(CI_CLIENTE_SEARCH_DEBOUNCE_MS === 280, "debounce");
  assert(shouldRunCiClienteSearch("a") === false, "abaixo do mínimo");
  assert(shouldRunCiClienteSearch("an") === true, "atinge mínimo");

  const hit = {
    nome: "Maria Silva",
    documento: "12345678901",
    telefone: "11999887766",
    tenant_id: "t1",
  };
  assert(matchCiClienteTypeahead(hit, "Maria", "t1"), "typeahead por nome");
  assert(matchCiClienteTypeahead(hit, "123456", "t1"), "typeahead por documento");
  assert(matchCiClienteTypeahead(hit, "99988", "t1"), "typeahead por telefone");
  assert(
    matchCiClienteTypeahead(hit, "Maria", "t2") === false,
    "isolamento por tenant",
  );
  assert(matchCiClienteTypeahead(hit, "x") === false, "não busca < mínimo");
}

console.log("\nFiltros / links / limpar");
{
  assert(ciClearHref("demo") === "/demo/vendas/dashboard", "limpar cliente/filtros");
  assert(ciHref("demo", { clienteId: "abc" }).includes("cliente=abc"), "UUID interno na URL");
  const isolated = assertTenantIsolation(
    [venda({ tenant_id: "t1" }), venda({ id: "x", tenant_id: "t2" })],
    "t1",
  );
  assert(isolated.length === 1, "tenant isolation vendas");
  const period = resolveCiPeriod({ hoje: "2026-07-20", preset: "mes" });
  assert(period.de === "2026-07-01", "timezone mês");
}

console.log("\nCobertura baixa");
{
  const low = composeCommercialIntelligence({
    vendas: [
      venda({ id: "a", canal_venda: "padrao", total: 100, data_venda: "2026-07-02", created_at: "2026-07-02T10:00:00.000Z" }),
      venda({ id: "b", canal_venda: "padrao", total: 100, data_venda: "2026-07-03", created_at: "2026-07-03T10:00:00.000Z" }),
      venda({ id: "c", canal_venda: "os", total: 100, data_venda: "2026-07-04", created_at: "2026-07-04T10:00:00.000Z" }),
    ],
    filters,
    now,
  });
  assert(low.cobertura.coberturaOrigemBaixa === true, "cobertura baixa");
  assert(low.cobertura.avisoOrigem === CI_ORIGEM_COBERTURA_BAIXA_MSG, "aviso origem");
}

console.log("\nFórmula / NaN");
{
  assert(CI_CONVERSAO_FORMULA.includes("Taxa de conversão comercial"), "fórmula");
  for (const v of [
    data.kpis.faturamentoPeriodo.value,
    data.cobertura.coberturaOrigemPct,
  ]) {
    assertFinite(v, `finite ${v}`);
  }
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
