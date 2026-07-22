#!/usr/bin/env node
/**
 * Testes unitários — faturamento dashboard + timezone + meta diária.
 */
import {
  aggregateFaturamentoLiquido,
  calcFaltaParaMeta,
  calcPercentualAtingido,
  classifyMetaDiaStatus,
  isCrAvulsaValidaParaFaturamento,
  isVendaValidaParaFaturamento,
} from "../lib/dashboard/faturamento-agregacao.ts";
import {
  civilDateInTimezone,
  sameWeekdayPreviousWeek,
  shiftCivilDate,
} from "../lib/dashboard/tenant-timezone.ts";
import { resolveMetaDiaria } from "../lib/metas/meta-diaria.ts";
import {
  buildResumoDiaRow,
  buildTotalGeral,
  calcDiferenca,
  calcPctAtingido,
  calcPctDiferenca,
  classifySituacao,
  daysInMonth,
  eachDayOfMonth,
  labelDiaSemanaData,
} from "../lib/dashboard/resumo-vendas-mes.ts";

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

console.log("\nDashboard — faturamento / timezone / metas\n");

// --- timezone near midnight BR ---
{
  // 2026-07-21 02:30 UTC = 2026-07-20 23:30 America/Sao_Paulo
  const lateBr = new Date("2026-07-21T02:30:00.000Z");
  assert(
    civilDateInTimezone(lateBr, "America/Sao_Paulo") === "2026-07-20",
    "23:30 BR não vira dia seguinte (UTC)",
  );

  // 2026-07-21 03:05 UTC = 2026-07-21 00:05 America/Sao_Paulo
  const earlyBr = new Date("2026-07-21T03:05:00.000Z");
  assert(
    civilDateInTimezone(earlyBr, "America/Sao_Paulo") === "2026-07-21",
    "00:05 BR permanece no dia civil",
  );

  // noon
  const noon = new Date("2026-07-20T15:00:00.000Z");
  assert(
    civilDateInTimezone(noon, "America/Sao_Paulo") === "2026-07-20",
    "12:00 BR (aprox) no dia civil",
  );

  assert(shiftCivilDate("2026-07-20", -1) === "2026-07-19", "shift -1 dia");
  assert(
    sameWeekdayPreviousWeek("2026-07-20") === "2026-07-13",
    "mesmo dia semana anterior",
  );
}

// --- venda criada hoje entra; cancelada não ---
{
  const vendas = [
    {
      status: "faturado",
      deleted_at: null,
      subtotal: 1000,
      desconto_total: 100,
      total: 900,
      data_venda: "2026-07-20",
    },
    {
      status: "cancelado",
      deleted_at: null,
      subtotal: 500,
      desconto_total: 0,
      total: 500,
      data_venda: "2026-07-20",
    },
    {
      status: "em_andamento",
      deleted_at: null,
      subtotal: 200,
      desconto_total: 0,
      total: 200,
      data_venda: "2026-07-20",
    },
    {
      status: "faturado",
      deleted_at: null,
      subtotal: 300,
      desconto_total: 0,
      total: 300,
      data_venda: "2026-07-19",
    },
  ];

  assert(isVendaValidaParaFaturamento(vendas[0]), "faturada válida");
  assert(!isVendaValidaParaFaturamento(vendas[1]), "cancelada inválida");
  assert(!isVendaValidaParaFaturamento(vendas[2]), "em_andamento inválida");

  const hoje = aggregateFaturamentoLiquido({
    vendas,
    dataDe: "2026-07-20",
    dataAte: "2026-07-20",
  });
  assert(hoje.liquido === 900, "desconto altera líquido (900)");
  assert(hoje.quantidade_vendas === 1, "só 1 venda válida hoje");
  assert(hoje.ticket_medio === 900, "ticket médio = líquido/qtd");

  const ontemNaoEntra = aggregateFaturamentoLiquido({
    vendas,
    dataDe: "2026-07-20",
    dataAte: "2026-07-20",
  });
  assert(
    ontemNaoEntra.liquido === 900,
    "venda de ontem não entra no card de hoje",
  );
}

// --- venda rápida (faturada) entra ---
{
  const agg = aggregateFaturamentoLiquido({
    vendas: [
      {
        status: "faturado",
        deleted_at: null,
        subtotal: 150,
        desconto_total: 0,
        total: 150,
        data_venda: "2026-07-20",
      },
    ],
    dataDe: "2026-07-20",
    dataAte: "2026-07-20",
  });
  assert(agg.liquido === 150, "venda rápida faturada entra");
}

// --- OS faturada = via venda; CR com venda_id não duplica ---
{
  const agg = aggregateFaturamentoLiquido({
    vendas: [
      {
        status: "faturado",
        deleted_at: null,
        subtotal: 2000,
        desconto_total: 0,
        total: 2000,
        data_venda: "2026-07-20",
      },
    ],
    crAvulsas: [
      {
        status: "aberto",
        deleted_at: null,
        venda_id: "venda-os-1",
        valor_original: 2000,
        data_competencia: "2026-07-20",
      },
      {
        status: "aberto",
        deleted_at: null,
        venda_id: null,
        valor_original: 100,
        data_competencia: "2026-07-20",
      },
    ],
    dataDe: "2026-07-20",
    dataAte: "2026-07-20",
  });
  assert(
    !isCrAvulsaValidaParaFaturamento({
      status: "aberto",
      deleted_at: null,
      venda_id: "x",
    }),
    "CR ligada à venda não entra",
  );
  assert(agg.liquido === 2100, "OS+venda sem duplicidade + CR avulsa");
  assert(agg.quantidade_vendas === 1, "qtd só conta vendas");
}

// --- meta diária / percentual / diferença ---
{
  const meta = resolveMetaDiaria({
    competencia: "2026-07-01",
    valorMetaMensal: 23000, // 23 dias úteis em jul/2026? let's compute via rateio
    data: "2026-07-20", // segunda
  });
  assert(meta.fonte === "rateio", "rateio em dia útil");
  assert(meta.meta_diaria > 0, "meta diária > 0");

  const fds = resolveMetaDiaria({
    competencia: "2026-07-01",
    valorMetaMensal: 23000,
    data: "2026-07-19", // domingo
  });
  assert(fds.fonte === "zero_fds", "fim de semana meta 0");
  assert(fds.meta_diaria === 0, "meta fds = 0");

  const manual = resolveMetaDiaria({
    competencia: "2026-07-01",
    valorMetaMensal: 23000,
    data: "2026-07-20",
    override: { data: "2026-07-20", valor_meta: 5000 },
  });
  assert(manual.fonte === "manual", "override manual");
  assert(manual.meta_diaria === 5000, "valor manual");

  const pct = calcPercentualAtingido(800, 1000);
  assert(pct === 80, "percentual 80%");
  assert(calcFaltaParaMeta(800, 1000) === 200, "falta 200");
  assert(classifyMetaDiaStatus(79, 1000) === "abaixo", "status abaixo");
  assert(classifyMetaDiaStatus(80, 1000) === "atencao", "status atenção");
  assert(classifyMetaDiaStatus(100, 1000) === "atingida", "status atingida");
  assert(classifyMetaDiaStatus(110, 1000) === "superada", "status superada");
}

// --- isolamento tenant (regra de agregação pura — filtro é responsabilidade do service) ---
{
  const tenantA = aggregateFaturamentoLiquido({
    vendas: [
      {
        status: "faturado",
        deleted_at: null,
        subtotal: 10,
        total: 10,
        data_venda: "2026-07-20",
      },
    ],
    dataDe: "2026-07-20",
    dataAte: "2026-07-20",
  });
  const tenantB = aggregateFaturamentoLiquido({
    vendas: [],
    dataDe: "2026-07-20",
    dataAte: "2026-07-20",
  });
  assert(tenantA.liquido !== tenantB.liquido, "agregações isoladas por input");
}

// --- Resumo de Vendas do Mês (planilha) ---
{
  assert(daysInMonth(2026, 1) === 28, "fev/2026 = 28 dias");
  assert(daysInMonth(2024, 1) === 29, "fev/2024 = 29 dias");
  assert(daysInMonth(2026, 3) === 30, "abr/2026 = 30 dias");
  assert(daysInMonth(2026, 6) === 31, "jul/2026 = 31 dias");
  assert(eachDayOfMonth(2026, 6).length === 31, "31 linhas em julho");
  assert(
    labelDiaSemanaData("2026-04-01").startsWith("quarta"),
    "label quarta 01/abr",
  );

  const acima = buildResumoDiaRow({
    data: "2026-04-01",
    meta: 11630,
    meta_fonte: "rateio",
    realizado: 11873,
    kind: "passado",
  });
  assert(Math.abs(acima.diferenca - 243) < 0.001, "diferença +243");
  assert(
    Math.abs((acima.pct_atingido ?? 0) - 102.1) < 0.05,
    "% atingido ~102,1",
  );
  assert(
    Math.abs((acima.pct_diferenca ?? 0) - 2.1) < 0.05,
    "% diferença ~+2,1",
  );
  assert(acima.atingida === true, "meta atingida");

  const abaixo = buildResumoDiaRow({
    data: "2026-04-02",
    meta: 1000,
    meta_fonte: "rateio",
    realizado: 800,
    kind: "passado",
  });
  assert(abaixo.diferenca === -200, "diferença negativa");
  assert(abaixo.pct_diferenca === -20, "% diferença -20");

  const semVenda = buildResumoDiaRow({
    data: "2026-04-03",
    meta: 1000,
    meta_fonte: "rateio",
    realizado: 0,
    kind: "passado",
  });
  assert(semVenda.realizado === 0, "dia sem venda = 0");
  assert(semVenda.pct_atingido === 0, "% atingido 0");

  const futuro = buildResumoDiaRow({
    data: "2026-04-30",
    meta: 1000,
    meta_fonte: "rateio",
    realizado: 999,
    kind: "futuro",
  });
  assert(futuro.realizado == null, "futuro sem realizado");
  assert(futuro.diferenca == null, "futuro sem diferença");
  assert(futuro.pct_atingido == null, "futuro sem %");

  assert(calcPctAtingido(100, 0) == null, "meta zero não divide");
  assert(calcPctDiferenca(100, 0) == null, "meta zero % diff null");
  assert(calcDiferenca(100, 0) === 100, "diferença com meta 0 ok");

  const rows = [
    buildResumoDiaRow({
      data: "2026-04-01",
      meta: 1000,
      meta_fonte: "rateio",
      realizado: 1100,
      kind: "passado",
    }),
    buildResumoDiaRow({
      data: "2026-04-02",
      meta: 1000,
      meta_fonte: "rateio",
      realizado: 900,
      kind: "hoje",
    }),
    buildResumoDiaRow({
      data: "2026-04-03",
      meta: 1000,
      meta_fonte: "rateio",
      realizado: null,
      kind: "futuro",
    }),
  ];
  const total = buildTotalGeral(rows);
  assert(total.meta_total === 3000, "meta total mês");
  assert(total.realizado_acumulado === 2000, "realizado até hoje");
  assert(total.diferenca === -1000, "diff acumulada vs meta total");
  assert(total.situacao === "muito_abaixo", "total situação muito abaixo");

  assert(
    classifySituacao({ kind: "passado", meta: 100, pctAtingido: 50 }) ===
      "muito_abaixo",
    "situação <70",
  );
  assert(
    classifySituacao({ kind: "passado", meta: 100, pctAtingido: 75 }) ===
      "abaixo",
    "situação 70-89",
  );
  assert(
    classifySituacao({ kind: "passado", meta: 100, pctAtingido: 95 }) ===
      "atencao",
    "situação 90-99",
  );
  assert(
    classifySituacao({ kind: "passado", meta: 100, pctAtingido: 105 }) ===
      "atingida",
    "situação 100-109",
  );
  assert(
    classifySituacao({ kind: "passado", meta: 100, pctAtingido: 120 }) ===
      "superou",
    "situação >=110",
  );
  assert(
    classifySituacao({ kind: "futuro", meta: 100, pctAtingido: null }) ===
      "futuro",
    "situação futuro",
  );
  assert(
    classifySituacao({ kind: "passado", meta: 0, pctAtingido: null }) ===
      "neutro",
    "situação meta zero",
  );
  assert(acima.situacao === "atingida", "linha acima = atingida (102%)");
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
