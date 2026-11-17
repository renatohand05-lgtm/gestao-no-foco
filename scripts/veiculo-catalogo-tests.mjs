#!/usr/bin/env node
/**
 * Testes do catálogo de carros embutido (lib/veiculos/catalogo).
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";

import {
  acharMarca,
  acharModelo,
  anosPossiveis,
  buscarModelosEmTodasAsMarcas,
  expandirAnos,
  filtrar,
  inferirMotorizacao,
  marcaUnicaDoModelo,
  montarCatalogo,
  resumirAnos,
} from "../lib/veiculos/catalogo/index.ts";

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

const bruto = JSON.parse(
  readFileSync(new URL("../lib/veiculos/catalogo/carros.json", import.meta.url), "utf8"),
);
const cat = montarCatalogo(bruto);

console.log("\nEstrutura");
assert(cat.marcas.length >= 100, `pelo menos 100 marcas (${cat.marcas.length})`);
let vazios = 0;
let semAno = 0;
let versoes = 0;
for (const marca of cat.marcas) {
  if (!marca.nome) vazios++;
  for (const modelo of marca.modelos) {
    if (!modelo.nome) vazios++;
    for (const versao of modelo.versoes) {
      versoes++;
      if (!versao.nome) vazios++;
      if (!expandirAnos(versao.anos).length) semAno++;
    }
  }
}
assert(vazios === 0, "nenhum nome vazio");
assert(semAno === 0, `toda versão tem ao menos um ano (${versoes} versões)`);

console.log("\nMarcas e apelidos");
assert(acharMarca(cat, "vw")?.nome === "Volkswagen", "vw → Volkswagen");
assert(acharMarca(cat, "GM")?.nome === "Chevrolet", "gm → Chevrolet");
assert(acharMarca(cat, "mercedes")?.nome === "Mercedes-Benz", "mercedes → Mercedes-Benz");
assert(acharMarca(cat, "citroen")?.nome === "Citroën", "sem acento: citroen → Citroën");

console.log("\nBusca");
const vw = acharMarca(cat, "Volkswagen");
const gol = acharModelo(vw, "gol");
assert(gol && gol.versoes.length > 20, "Gol existe e tem várias versões");
assert(filtrar(vw.modelos, "t cross", 5)[0]?.nome === "T-Cross", "'t cross' acha T-Cross");
assert(filtrar(vw.modelos, "tcross", 5)[0]?.nome === "T-Cross", "'tcross' acha T-Cross");
assert(filtrar(vw.modelos, "UP", 5)[0]?.nome === "up!", "'up' prioriza up!");
const flex = filtrar(gol.versoes, "1.0 flex", 10);
assert(
  flex.length > 0 && flex.every((v) => v.busca.includes("1.0") && v.busca.includes("flex")),
  "versões '1.0 flex' contêm todas as palavras",
);
assert(
  buscarModelosEmTodasAsMarcas(cat, "onix", 10).some(
    (r) => r.marca.nome === "Chevrolet" && r.modelo.nome === "Onix",
  ),
  "modelo sem marca: 'onix' → Chevrolet Onix",
);
assert(marcaUnicaDoModelo(cat, "Gol") === "Volkswagen", "marcaUnicaDoModelo(Gol)");
assert(marcaUnicaDoModelo(cat, "Classic") === null, "modelo ambíguo → sem marca");

console.log("\nAnos");
assert(
  JSON.stringify(expandirAnos("2008-2010,2013")) === "[2013,2010,2009,2008]",
  "expandirAnos",
);
assert(resumirAnos("2008-2013,2015") === "2008–2015", "resumirAnos");
const anos = anosPossiveis(gol, null);
assert(anos.length > 30 && anos[0] > anos[anos.length - 1], "anos do modelo, mais novo primeiro");

console.log("\nCombustível e câmbio pela versão");
const m = (s) => JSON.stringify(inferirMotorizacao(s));
assert(m("1.0 Flex 12V Mec.") === '{"combustivel":"Flex","cambio":"Manual"}', "Flex + Mec.");
assert(m("2.0 TDI Aut.") === '{"combustivel":"Diesel","cambio":"Automático"}', "TDI + Aut.");
assert(m("1.6 Hybrid CVT") === '{"combustivel":"Híbrido","cambio":"Automático"}', "Hybrid + CVT");
assert(m("1.8 16V Aut. (Híbrido)").includes("Híbrido"), "(Híbrido)");
assert(m("1.0 Turbo 200 TSI") === "{}", "sem pistas → nada inventado");

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
