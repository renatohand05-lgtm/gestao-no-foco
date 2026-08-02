#!/usr/bin/env node
/**
 * Sprint 30.3 — templates por segmento (somente catálogo).
 */
import { ENTERPRISE_SEGMENTS } from "../config/onboarding/segments.ts";
import {
  getSegmentTemplatePack,
  listTemplateCategories,
} from "../config/onboarding/templates.ts";

let pass = 0;
let fail = 0;

function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("Phase 30.3 — templates\n");

for (const seg of ENTERPRISE_SEGMENTS) {
  const pack = getSegmentTemplatePack(seg.id);
  check(`${seg.id} tem pack`, pack.segmentId === seg.id && pack.items.length > 0);
  check(
    `${seg.id} sem insert language`,
    !/insert into|supabase\.from/i.test(JSON.stringify(pack)),
  );
}

const oficina = getSegmentTemplatePack("oficina");
check(
  "oficina categorias+servicos+produtos",
  ["categorias", "servicos", "produtos"].every((c) =>
    listTemplateCategories("oficina").includes(c),
  ),
);
check("oficina tem centros_custo", listTemplateCategories("oficina").includes("centros_custo"));

const comercio = listTemplateCategories("comercio");
check("comercio tem estoque+vendas+contas", ["estoque", "vendas", "contas"].every((c) => comercio.includes(c)));

const rest = listTemplateCategories("restaurante");
check("restaurante producao+delivery+salao", ["producao", "delivery", "salao"].every((c) => rest.includes(c)));

const serv = listTemplateCategories("servicos");
check("servicos agenda+ordens+profissionais", ["agenda", "ordens", "profissionais"].every((c) => serv.includes(c)));

const cons = listTemplateCategories("consultoria");
check(
  "consultoria projetos+contratos+horas+clientes",
  ["projetos", "contratos", "horas", "clientes"].every((c) => cons.includes(c)),
);

check("fallback outro", getSegmentTemplatePack("xyz").segmentId === "outro");
check("oficina title", /Oficina/i.test(oficina.title));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
