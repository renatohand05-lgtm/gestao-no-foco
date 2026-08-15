#!/usr/bin/env node
/**
 * Sprint 30.1 — navegação multissetorial (sem importar lucide via navigation.ts).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getOpsCenterCopy,
  getSegmentNavLabels,
} from "../config/segment-labels.ts";

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

function navWouldShowTeam(segment) {
  return getSegmentNavLabels(segment).showTeamNavItem;
}

function teamTitle(segment) {
  return getSegmentNavLabels(segment).team;
}

check("comércio oculta item equipe técnica", navWouldShowTeam("comercio") === false);
check("restaurante oculta item equipe técnica", navWouldShowTeam("restaurante") === false);
check("oficina mostra Mecânicos", teamTitle("oficina") === "Mecânicos" && navWouldShowTeam("oficina"));
check("serviços mostra Profissionais", teamTitle("servicos") === "Profissionais");
check("consultoria mostra Consultores", teamTitle("consultoria") === "Consultores");
check("fallback Equipe", teamTitle(null) === "Equipe");
check("comércio ops copy sem oficina", !/oficina/i.test(getOpsCenterCopy("comercio").pageDescription));
check("oficina ops copy menciona oficina", /oficina/i.test(getOpsCenterCopy("oficina").pageDescription));
check("comércio sem veículo no board", getOpsCenterCopy("comercio").showVehicleFields === false);
check("oficina com veículo no board", getOpsCenterCopy("oficina").showVehicleFields === true);

const navSrc = readFileSync(resolve("config/navigation.ts"), "utf8");
const sidebar = readFileSync(resolve("components/layout/app-sidebar.tsx"), "utf8");
check("navigation usa getSegmentNavLabels", /getSegmentNavLabels/.test(navSrc));
check("navigation filtra mechanics", /item\.id === "mechanics"/.test(navSrc));
check("sidebar passa tenant.segment", /getTenantNav\(tenant\.slug,\s*tenant\.segment/.test(sidebar));
check("rota interna mecanicos preservada", /oficina\/mecanicos/.test(navSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
