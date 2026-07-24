#!/usr/bin/env node
/**
 * Testes — Central Inteligente de OS (Gate 18.1 / 18.1.1 / 18.1.2)
 */
import {
  buildOsCentralPagination,
  composeOsCentralKpis,
  enrichOsCentralRows,
  filterOsCentralRows,
  formatTempoDesdeAbertura,
  hasOsCentralFilters,
  OS_CENTRAL_PER_PAGE_OPTIONS,
  OS_CENTRAL_SORT_OPTIONS,
  OS_RESPONSAVEL_FALLBACK,
  osCentralClearHref,
  osCentralHref,
  resolveOsCentralSort,
  resolveOsResponsavel,
  sortOsCentralRows,
} from "../lib/ordens/os-central-compose.ts";

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

console.log("\nOrdens — Central Inteligente (18.1.2)\n");

const now = new Date("2026-07-23T15:00:00.000Z");
const hoje = "2026-07-23";

function item(partial) {
  return {
    id: "x",
    numero: 1,
    status: "em_execucao",
    cliente_id: "c",
    cliente_nome: "Cliente",
    veiculo_id: null,
    placa: null,
    modelo: null,
    data_abertura: "2026-07-20",
    previsao_entrega: null,
    data_conclusao: null,
    aceite_entrega_em: null,
    valor_total: 100,
    mecanico_id: null,
    venda_id: null,
    prioridade: "normal",
    arquivado_em: null,
    recurso_id: null,
    responsavel: { id: null, nome: "Não atribuído", origem: "fallback" },
    ...partial,
  };
}

// --- Resolver ---
{
  assert(
    resolveOsResponsavel({
      principalAlocacao: { mecanicoId: "m1", nomeCompleto: "João" },
    }).source === "alocacao_principal",
    "responsável: alocação principal",
  );
  assert(
    resolveOsResponsavel({
      mecanicoId: "p1",
      profileNomeById: { p1: "Perfil" },
    }).source === "profile_id",
    "responsável: profile",
  );
  assert(
    resolveOsResponsavel({
      mecanicoId: "m1",
      mecanicoNomeById: { m1: "Mec" },
    }).source === "mecanico_id",
    "responsável: mecanico_id",
  );
  assert(
    resolveOsResponsavel({}).nome === "Não atribuído" &&
      resolveOsResponsavel({}).nome === OS_RESPONSAVEL_FALLBACK,
    "responsável: fallback",
  );
}

// --- Finalização ---
{
  // KPIs usam isoToday() (UTC civil) — alinhar fixtures ao relógio real.
  const hojeKpi = new Date().toISOString().slice(0, 10);
  const ontemKpi = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const items = [
    item({
      id: "1",
      numero: 1,
      data_conclusao: hojeKpi,
      status: "entregue",
      aceite_entrega_em: `${hojeKpi}T14:00:00.000Z`,
    }),
    item({
      id: "2",
      numero: 2,
      data_conclusao: ontemKpi,
      status: "entregue",
      aceite_entrega_em: `${ontemKpi}T10:00:00.000Z`,
    }),
    item({
      id: "3",
      numero: 3,
      data_conclusao: null,
      status: "em_execucao",
    }),
  ];
  const kpis = composeOsCentralKpis(items);
  assert(kpis.finalizadasHoje === 1, "finalizada hoje via data_conclusao");
  assert(kpis.entreguesHoje === 1, "entregue hoje via aceite_entrega_em");

  const kpisOpts = composeOsCentralKpis(items, {
    finalizadasHoje: 5,
    entreguesHoje: 3,
  });
  assert(kpisOpts.finalizadasHoje === 5, "finalizadas hoje override server count");
  assert(kpisOpts.entreguesHoje === 3, "entregues hoje override");

  const semEntrega = composeOsCentralKpis(items, { entreguesHoje: null });
  assert(semEntrega.entreguesHoje === null, "entregues hoje ocultável");
}

// --- Paginação ---
{
  const p1 = buildOsCentralPagination({ page: 1, perPage: 25, total: 100 });
  assert(p1.from === 1 && p1.to === 25 && p1.total === 100, "paginação página 1");
  assert(p1.hasPrev === false && p1.hasNext === true, "paginação next/prev p1");
  assert(
    p1.label === "Exibindo 1–25 de 100 registros",
    "label Exibindo X–Y de N",
  );

  const mid = buildOsCentralPagination({ page: 2, perPage: 50, total: 120 });
  assert(mid.from === 51 && mid.to === 100, "paginação intermediária");

  const last = buildOsCentralPagination({ page: 3, perPage: 50, total: 120 });
  assert(last.from === 101 && last.to === 120, "última página");
  assert(last.hasNext === false, "sem next na última");

  const empty = buildOsCentralPagination({ page: 1, perPage: 25, total: 0 });
  assert(empty.label.includes("0–0 de 0"), "paginação zero resultados");

  assert(
    OS_CENTRAL_PER_PAGE_OPTIONS.join(",") === "25,50,100",
    "perPage 25/50/100",
  );

  const href = osCentralHref("acme", {
    status: "em_execucao",
    sort: "maior_valor",
    page: 2,
    perPage: 50,
  });
  assert(href.includes("page=2") && href.includes("perPage=50"), "href preserva page/perPage");
  assert(href.includes("sort=maior_valor"), "href preserva ordenação");
  assert(osCentralClearHref("acme") === "/acme/ordens", "reset filtros");
  assert(hasOsCentralFilters({ status: "x" }) === true, "hasFilters");
  assert(hasOsCentralFilters({}) === false, "hasFilters vazio");
}

// --- Enrich / SLA / labels ---
{
  const rows = enrichOsCentralRows(
    [
      item({
        id: "1",
        previsao_entrega: `${hoje}T12:00:00`,
        responsavel: {
          id: "m1",
          nome: "João",
          origem: "alocacao_principal",
        },
      }),
    ],
    { now },
  );
  assert(rows[0].previstaHoje === true, "prevista para hoje");
  assert(rows[0].slaLabel === "Prevista para hoje", "label Prevista para hoje");
  assert(rows[0].responsavel.nome === "João", "responsavel no list item");
  assert(
    formatTempoDesdeAbertura(30).startsWith("Aberta há"),
    "Tempo desde abertura",
  );
  assert(
    composeOsCentralKpis([
      item({ status: "em_execucao", valor_total: 10 }),
      item({ status: "aguardando_peca", valor_total: 20 }),
    ]).valorEmProducao === 30,
    "Valor em produção",
  );
}

// --- Filtros / sort / empty ---
{
  const rows = enrichOsCentralRows(
    [
      item({
        id: "1",
        numero: 101,
        prioridade: "urgente",
        cliente_nome: "Bruno",
        placa: "XYZ",
        valor_total: 500,
        responsavel: { id: null, nome: "Não atribuído", origem: "fallback" },
      }),
      item({
        id: "2",
        numero: 102,
        prioridade: "baixa",
        cliente_nome: "Ana",
        valor_total: 900,
        data_abertura: "2026-07-01",
        responsavel: { id: "a", nome: "Ana Mec", origem: "mecanico_id" },
      }),
    ],
    { now },
  );

  const filtered = filterOsCentralRows(rows, {
    prioridade: "urgente",
    cliente: "bruno",
  });
  assert(filtered.length === 1, "filtros combinados");

  const empty = filterOsCentralRows(rows, { cliente: "zzzz" });
  assert(empty.length === 0, "empty state por filtro");

  assert(sortOsCentralRows(rows, "maior_valor")[0].numero === 102, "sort valor");
  assert(
    resolveOsCentralSort("entrega_hoje") === "previstas_hoje",
    "alias sort",
  );
  assert(
    OS_CENTRAL_SORT_OPTIONS.some((o) => o.label === "Previstas para hoje"),
    "option previstas",
  );
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
