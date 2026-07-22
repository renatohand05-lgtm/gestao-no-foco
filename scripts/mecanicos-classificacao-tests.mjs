#!/usr/bin/env node
/**
 * Testes de validação de classificação financeira (UUIDs obrigatórios).
 */
import {
  assertClassificacaoCustoIds,
  isUuid,
} from "../lib/mecanicos/classificacao.ts";

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

console.log("\nMecânicos — classificação financeira\n");

const uuid = "3f5f4550-eb09-41cb-b504-6ef14cdda6a1";
const uuid2 = "5893cc99-e514-4806-8e59-46cdf7478b2c";
const uuid3 = "30695788-5fe7-4685-a2b2-8bb50076478a";

assert(isUuid(uuid), "isUuid aceita UUID válido");
assert(!isUuid("SALARIOS"), "isUuid rejeita nome");
assert(!isUuid("X3"), "isUuid rejeita código");
assert(!isUuid(""), "isUuid rejeita vazio");
assert(!isUuid(null), "isUuid rejeita null");

try {
  assertClassificacaoCustoIds({
    categoria_financeira_id: uuid,
    plano_conta_id: uuid2,
    centro_custo_id: uuid3,
  });
  assert(true, "assert aceita três UUIDs");
} catch {
  assert(false, "assert aceita três UUIDs");
}

try {
  assertClassificacaoCustoIds({
    categoria_financeira_id: "",
    plano_conta_id: uuid2,
    centro_custo_id: uuid3,
  });
  assert(false, "bloqueia sem categoria");
} catch (e) {
  assert(
    String(e.message).includes("categoria financeira"),
    "bloqueia sem categoria",
  );
}

try {
  assertClassificacaoCustoIds({
    categoria_financeira_id: uuid,
    plano_conta_id: "X3",
    centro_custo_id: uuid3,
  });
  assert(false, "bloqueia plano com código/texto");
} catch (e) {
  assert(
    String(e.message).includes("conta contábil"),
    "bloqueia plano com código/texto",
  );
}

try {
  assertClassificacaoCustoIds({
    categoria_financeira_id: "SALARIOS",
    plano_conta_id: uuid2,
    centro_custo_id: "",
  });
  assert(false, "bloqueia múltiplos faltantes");
} catch (e) {
  const msg = String(e.message);
  assert(
    msg.includes("categoria") && msg.includes("centro"),
    "mensagem lista categoria e centro faltantes",
  );
}

console.log(`\nResult: PASS=${pass} FAIL=${fail}\n`);
process.exit(fail > 0 ? 1 : 0);
