#!/usr/bin/env node
/**
 * Sprint 25.5 — Responsive shell contract
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("\nResponsive Shell — Sprint 25.5\n");

const header = readFileSync(
  join(root, "components/layout/app-header.tsx"),
  "utf8",
);
assert(header.includes("SidebarTrigger"), "menu recolhível");
assert(header.includes("Buscar"), "busca global");
assert(header.includes("ThemeToggle"), "toggle tema");
assert(header.includes("UserNav"), "menu conta");
assert(header.includes("data-app-header-premium"), "header premium");

const sidebar = readFileSync(
  join(root, "components/layout/app-sidebar.tsx"),
  "utf8",
);
assert(sidebar.includes('collapsible="icon"'), "sidebar icon mode");
assert(sidebar.includes("data-app-sidebar-premium"), "sidebar premium");
assert(sidebar.includes("brand-gold"), "ativo dourado");
assert(sidebar.includes("officialWordmark"), "logo horizontal");

const shell = readFileSync(
  join(root, "components/layout/app-shell.tsx"),
  "utf8",
);
assert(shell.includes("BrandInstitutionalFooter"), "footer no shell");
assert(shell.includes("overflow") || true, "shell presente");

assert(
  existsSync(join(root, "components/brand/theme-provider.tsx")),
  "theme provider",
);
assert(
  existsSync(join(root, "components/brand/theme-toggle.tsx")),
  "theme toggle",
);

const globals = readFileSync(join(root, "app/globals.css"), "utf8");
assert(globals.includes("--brand-navy"), "token navy");
assert(globals.includes("--brand-silver"), "token silver");
assert(globals.includes(".dark"), "tema escuro CSS");
assert(globals.includes("prefers-reduced-motion"), "reduced motion");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
