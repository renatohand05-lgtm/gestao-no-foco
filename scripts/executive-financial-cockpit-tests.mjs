#!/usr/bin/env node
/**
 * Testes — Cockpit Financeiro Executivo (Gate 17.2 / 17.2.1)
 */
import {
  classifyCashHealth,
  composeExecutiveFinancialCockpit,
  pickMaiorCompromisso,
} from "../lib/dashboard/executive-financial-cockpit-service.ts";

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

function finite(...vals) {
  return vals.every(
    (v) => v == null || (typeof v === "number" && !Number.isNaN(v)),
  );
}

function calcSaldo(row) {
  return Math.max(
    row.valor_original - row.desconto + row.juros + row.multa - row.valor_pago,
    0,
  );
}

console.log("\nDashboard — Cockpit Financeiro\n");

const emptyCtx = {
  centro: null,
  estoque: null,
  pagar: null,
  receber: null,
  recursosRaw: null,
  fluxoMes: null,
  fluxo7d: null,
  fluxo30d: null,
  maiorCompromisso7d: null,
  temContaBancaria: null,
};

{
  const r = composeExecutiveFinancialCockpit(emptyCtx);
  assert(r.status === "unavailable", "ausência total = unavailable");
  assert(r.saude === "indisponivel", "saúde indisponível");
  assert(r.saldoAtual === null, "não inventa saldo zero");
  assert(r.receber30dVisaoParcial === true, "CR 30d visão parcial flag");
}

{
  const h = classifyCashHealth({
    saldoAtual: null,
    proj7: 100,
    pagarVencido: 0,
    receberVencido: 0,
  });
  assert(h.status === "indisponivel", "sem saldo = indisponível");
  assert(
    h.reason.toLowerCase().includes("saldo bancário"),
    "mensagem saldo bancário não informado",
  );
}

{
  const h = classifyCashHealth({
    saldoAtual: 1000,
    proj7: -50,
    pagarVencido: 0,
    receberVencido: 0,
  });
  assert(h.status === "critico", "projeção negativa = crítico");
}

{
  const h = classifyCashHealth({
    saldoAtual: 100,
    proj7: 200,
    pagarVencido: 500,
    receberVencido: 0,
  });
  assert(h.status === "critico", "vencido > saldo = crítico");
}

{
  const h = classifyCashHealth({
    saldoAtual: 5000,
    proj7: 4000,
    pagarVencido: 100,
    receberVencido: 0,
  });
  assert(h.status === "atencao", "há vencidos = atenção");
}

{
  const h = classifyCashHealth({
    saldoAtual: 10000,
    proj7: null,
    pagarVencido: 0,
    receberVencido: 0,
  });
  assert(h.status === "atencao", "proj7 ausente = atenção (não saudável)");
  assert(h.reason.toLowerCase().includes("parcial"), "projeção parcial");
}

{
  const h = classifyCashHealth({
    saldoAtual: 10000,
    proj7: 9000,
    pagarVencido: 0,
    receberVencido: 0,
  });
  assert(h.status === "saudavel", "saúde saudável");
}

{
  const picked = pickMaiorCompromisso(
    [
      {
        id: "a",
        descricao: "Grande original",
        fornecedor_nome: null,
        data_vencimento: "2026-07-25",
        valor_original: 10000,
        desconto: 0,
        juros: 0,
        multa: 0,
        valor_pago: 9000,
      },
      {
        id: "b",
        descricao: "Maior pendente",
        fornecedor_nome: "X",
        data_vencimento: "2026-07-24",
        valor_original: 3000,
        desconto: 0,
        juros: 0,
        multa: 0,
        valor_pago: 0,
      },
    ],
    calcSaldo,
  );
  assert(picked?.id === "b", "maior compromisso por saldo pendente");
  assert(picked?.valor === 3000, "valor = saldo pendente 3000");
  assert(picked?.valorSource === "saldo_pendente", "source saldo_pendente");
}

{
  const picked = pickMaiorCompromisso(
    [
      {
        id: "c",
        descricao: "Só original",
        fornecedor_nome: null,
        data_vencimento: "2026-07-26",
        valor_original: 1500,
        desconto: 0,
        juros: 0,
        multa: 0,
        valor_pago: 0,
      },
    ],
    () => Number.NaN,
  );
  assert(picked?.valorSource === "valor_original", "fallback valor_original");
  assert(picked?.valor === 1500, "fallback usa valor_original");
}

{
  const ctx = {
    ...emptyCtx,
    temContaBancaria: true,
    fluxo7d: {
      saldo_inicial: 1000,
      entradas_previstas: 2000,
      saidas_previstas: 500,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: 2500,
      saldo_atual: 1000,
    },
    fluxo30d: {
      saldo_inicial: 1000,
      entradas_previstas: 8000,
      saidas_previstas: 3000,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: 6000,
      saldo_atual: 1000,
    },
    pagar: {
      total_vencido: 0,
      quantidade_vencido: 0,
      total_aberto: 100,
      quantidade_aberto: 1,
      vencendo_hoje: 0,
      quantidade_vencendo_hoje: 0,
      proximos_7_dias: 400,
      quantidade_proximos_7: 1,
      proximos_30_dias: 900,
      quantidade_proximos_30: 2,
      total_pago: 0,
    },
    receber: {
      total_vencido: 0,
      quantidade_vencido: 0,
      total_aberto: 50,
      quantidade_aberto: 1,
      vencimentos_proximos: 200,
      quantidade_proximos: 1,
      total_recebido: 0,
    },
    maiorCompromisso7d: {
      id: "1",
      descricao: "Aluguel",
      fornecedorNome: "Imob",
      valor: 400,
      dataVencimento: "2026-07-25",
      valorSource: "saldo_pendente",
    },
  };
  const r = composeExecutiveFinancialCockpit(ctx);
  assert(r.saldoAtual === 1000, "saldo atual");
  assert(r.dias7.entradasPrevistas === 2000, "entradas 7 dias");
  assert(r.dias7.saidasPrevistas === 500, "saídas 7 dias");
  assert(r.dias30.entradasPrevistas === 8000, "entradas 30 dias (fluxo)");
  assert(r.receber30dVisaoParcial === true, "contas a receber visão parcial 30d");
  assert(r.dias7.saldoProjetado === 2500, "saldo projetado positivo 7d");
  assert(r.maiorCompromisso7d?.valorSource === "saldo_pendente", "maior = saldo pendente");
  assert(r.saude === "saudavel", "saudável sem vencidos");
  assert(finite(r.saldoAtual, r.dias7.saldoProjetado), "sem NaN");
}

{
  const ctx = {
    ...emptyCtx,
    temContaBancaria: true,
    fluxo7d: {
      saldo_inicial: 100,
      entradas_previstas: 0,
      saidas_previstas: 500,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: -400,
      saldo_atual: 100,
    },
    fluxo30d: null,
    pagar: {
      total_vencido: 200,
      quantidade_vencido: 2,
      total_aberto: 0,
      quantidade_aberto: 0,
      vencendo_hoje: 0,
      quantidade_vencendo_hoje: 0,
      proximos_7_dias: 0,
      quantidade_proximos_7: 0,
      proximos_30_dias: 0,
      quantidade_proximos_30: 0,
      total_pago: 0,
    },
    receber: {
      total_vencido: 50,
      quantidade_vencido: 1,
      total_aberto: 0,
      quantidade_aberto: 0,
      vencimentos_proximos: 0,
      quantidade_proximos: 0,
      total_recebido: 0,
    },
  };
  const r = composeExecutiveFinancialCockpit(ctx);
  assert(r.dias7.saldoProjetado === -400, "saldo projetado negativo");
  assert(r.saude === "critico", "saúde crítica");
  assert(r.status === "partial", "parcial sem 30d");
  assert(
    r.notice?.toLowerCase().includes("parcial"),
    "notice projeção parcial",
  );
  assert(r.dias30.saldoProjetado === null, "30d indisponível = null (não zero)");
}

{
  const ctx = {
    ...emptyCtx,
    temContaBancaria: false,
    fluxo7d: {
      saldo_inicial: 0,
      entradas_previstas: 100,
      saidas_previstas: 50,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: 50,
      saldo_atual: 0,
    },
  };
  const r = composeExecutiveFinancialCockpit(ctx);
  assert(r.saldoAtual === null, "sem conta bancária → saldo null");
  assert(r.saude === "indisponivel", "sem saldo = saúde indisponível");
}

{
  const ctx = {
    ...emptyCtx,
    temContaBancaria: true,
    fluxo7d: {
      saldo_inicial: 500,
      entradas_previstas: 0,
      saidas_previstas: 0,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: 500,
      saldo_atual: 500,
    },
    fluxo30d: {
      saldo_inicial: 500,
      entradas_previstas: 0,
      saidas_previstas: 0,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: 500,
      saldo_atual: 500,
    },
  };
  const r = composeExecutiveFinancialCockpit(ctx);
  assert(r.maiorCompromisso7d === null, "ausência de lançamentos futuros");
  assert(r.dias7.entradasPrevistas === 0, "zero real de entradas ok");
}

{
  const ctx = {
    ...emptyCtx,
    temContaBancaria: true,
    fluxo7d: {
      saldo_inicial: 1000,
      entradas_previstas: 0,
      saidas_previstas: 0,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: 1000,
      saldo_atual: 1000,
    },
    fluxo30d: {
      saldo_inicial: 1000,
      entradas_previstas: 0,
      saidas_previstas: 0,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      saldo_diario: 0,
      saldo_acumulado: 0,
      saldo_projetado: 1000,
      saldo_atual: 1000,
    },
    maiorCompromisso7d: {
      id: "x",
      descricao: "Fallback",
      fornecedorNome: null,
      valor: 800,
      dataVencimento: "2026-07-28",
      valorSource: "valor_original",
    },
  };
  const r = composeExecutiveFinancialCockpit(ctx);
  assert(
    r.maiorCompromisso7d?.valorSource === "valor_original",
    "compose preserva fallback valor_original",
  );
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
