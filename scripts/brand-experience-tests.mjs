#!/usr/bin/env node
/**
 * Sprint 25.5 — Brand experience contract
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  brandAssets,
  brandConfig,
  brandPalette,
  brandStorageKeys,
} from "../config/brand.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

console.log("\nBrand Experience — Sprint 25.5\n");

assert(brandConfig.name === "Gestão", "nome oficial");
assert(
  brandConfig.subtitle.includes("Gestão Inteligente"),
  "subtítulo oficial",
);
assert(
  brandConfig.positioning.includes("eleva sua gestão"),
  "posicionamento",
);
assert(brandConfig.pillars.length === 5, "5 pilares");
assert(brandPalette.gold === "#C9A84C", "dourado");
assert(brandPalette.navy === "#0B0F14", "navy");
assert(brandPalette.silver === "#C8CDD5", "prata");
assert(brandStorageKeys.theme === "gof-theme-preference", "storage tema");

const assets = [
  "public/brand/icon-512.png",
  "public/brand/icon-192.png",
  "public/brand/icon-96.png",
  "public/brand/icon-64.png",
  "public/brand/icon-32.png",
  "public/brand/icon-16.png",
  "public/brand/logo.svg",
  "public/brand/logo-light.svg",
  "public/brand/mark.svg",
  "public/brand/mark-light.svg",
  "public/brand/mark-64.png",
  "public/favicon.svg",
  "public/favicon-32.png",
  "public/apple-touch-icon.png",
];
for (const a of assets) {
  assert(existsSync(join(root, a)), `asset ${a}`);
}

assert(brandAssets.logo.includes("logo.svg"), "logo path");

const themeSrc = readFileSync(
  join(root, "lib/design-system/theme.ts"),
  "utf8",
);
assert(themeSrc.includes("GOF_DARK_MODE_ENABLED = true"), "dark mode enabled");
assert(themeSrc.includes('GOF_THEME_DEFAULT: GofThemeMode = "dark"'), "default dark");

const splash = readFileSync(
  join(root, "components/brand/premium-global-loader.tsx"),
  "utf8",
);
assert(splash.includes("brand-navy"), "loader fundo escuro");
assert(splash.includes("icon192") || splash.includes("icon-192"), "símbolo G oficial");
assert(splash.includes("sr-only"), "texto só acessível");
assert(!splash.includes("brandConfig.slogan"), "sem slogan visual");
assert(!splash.includes("brandConfig.edition"), "sem Enterprise visual");
const globals = readFileSync(join(root, "app/globals.css"), "utf8");
assert(globals.includes("premium-loader-halo"), "animação halo");
assert(globals.includes("prefers-reduced-motion"), "reduced motion global");
assert(globals.includes(".premium-loader-mark"), "pulso do símbolo");

const mark = readFileSync(
  join(root, "components/brand/brand-mark.tsx"),
  "utf8",
);
assert(!mark.includes(">G</span>") && mark.includes("Image"), "mark usa PNG oficial");

const login = readFileSync(
  join(root, "components/auth/auth-brand-panel.tsx"),
  "utf8",
);
assert(login.includes("positioning"), "login posicionamento");
assert(login.includes("officialWordmark"), "login wordmark oficial");

const form = readFileSync(
  join(root, "components/auth/login-form.tsx"),
  "utf8",
);
assert(form.includes("Lembrar acesso"), "lembrar acesso");
assert(form.includes("Recuperar senha"), "recuperar senha");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
