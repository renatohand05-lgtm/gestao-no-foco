#!/usr/bin/env node
/**
 * Sprint 25.4.3 — Comparação de cotações
 */
import {
  assertHumanWinnerDecision,
  buildQuotationComparison,
} from "../lib/supply/enterprise/quotation-comparison.ts";

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

console.log("\nQuotation Comparison — Sprint 25.4.3\n");

const rows = buildQuotationComparison([
  {
    produtoId: "p1",
    descricao: "Filtro",
    fornecedorId: "f1",
    fornecedorNome: "A",
    precoUnitario: 30,
    quantidade: 10,
    desconto: 0,
    freteInformado: 10,
    impostosInformados: null,
    prazoDias: 7,
    leadTimeDias: 5,
    validadeProposta: null,
    qualidadeHistorica: 0.9,
    entregaNoPrazoHistorica: 0.9,
  },
  {
    produtoId: "p1",
    descricao: "Filtro",
    fornecedorId: "f2",
    fornecedorNome: "B",
    precoUnitario: 25,
    quantidade: 10,
    desconto: 0,
    freteInformado: 40,
    impostosInformados: null,
    prazoDias: 20,
    leadTimeDias: 15,
    validadeProposta: null,
    qualidadeHistorica: 0.5,
    entregaNoPrazoHistorica: 0.5,
  },
]);

assert(rows.length === 1, "agrupa por produto");
assert(rows[0].offers.length === 2, "lado a lado");
assert(rows[0].suggestedFornecedorId != null, "sugestão com score");
assert(
  rows[0].offers[0].motivoSugestao != null ||
    rows[0].offers.some((o) => o.motivoSugestao),
  "explica critérios",
);

let auto = false;
try {
  assertHumanWinnerDecision({ mode: "por_item", selections: [] });
} catch {
  auto = true;
}
assert(auto, "não escolhe automaticamente");

let noJust = false;
try {
  assertHumanWinnerDecision({
    mode: "por_item",
    selections: [{ produtoKey: "p1", fornecedorId: "f1", justificativa: "  " }],
  });
} catch {
  noJust = true;
}
assert(noJust, "justificativa obrigatória");

assertHumanWinnerDecision({
  mode: "dividido",
  selections: [
    { produtoKey: "p1", fornecedorId: "f2", justificativa: "Melhor frete líquido" },
  ],
});
assert(true, "vencedor por item com justificativa");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
