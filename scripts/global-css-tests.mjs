#!/usr/bin/env node
/**
 * Sprint 25.7.1 — Validação real de app/globals.css via PostCSS/Tailwind 4.
 *
 * Cobre a causa raiz observada em runtime:
 * CssSyntaxError em globals.css:1:1 quando package.json está truncado
 * ("Unexpected end of JSON input") durante resolução de @import "tailwindcss".
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nGlobal CSS — Sprint 25.7.1\n");

const pkgPath = join(root, "package.json");
const cssPath = join(root, "app/globals.css");
const postcssPath = join(root, "postcss.config.mjs");

assert(existsSync(pkgPath), "package.json existe");
assert(existsSync(cssPath), "app/globals.css existe");
assert(existsSync(postcssPath), "postcss.config.mjs existe");

let pkg;
try {
  const raw = readFileSync(pkgPath, "utf8");
  assert(raw.trim().length > 0, "package.json não vazio");
  pkg = JSON.parse(raw);
  assert(pkg && typeof pkg === "object", "package.json JSON válido");
  assert(typeof pkg.name === "string" && pkg.name.length > 0, "package.json.name");
} catch (e) {
  assert(false, `package.json parse: ${e instanceof Error ? e.message : e}`);
}

const tw = pkg?.dependencies?.tailwindcss ?? pkg?.devDependencies?.tailwindcss;
const twPost = pkg?.devDependencies?.["@tailwindcss/postcss"];
const next = pkg?.dependencies?.next;
assert(typeof tw === "string" && tw.includes("4"), `tailwindcss v4 (${tw})`);
assert(
  typeof twPost === "string" && (twPost.includes("4") || twPost === "^4"),
  `@tailwindcss/postcss v4 (${twPost})`,
);
assert(typeof next === "string", `next presente (${next})`);

const css = readFileSync(cssPath, "utf8");
assert(
  css.includes('@import "tailwindcss"') ||
    css.includes("node_modules/tailwindcss/index.css"),
  "import Tailwind 4 (bare ou caminho explícito)",
);
assert(!css.includes("@tailwind base"), "sem sintaxe Tailwind 3 misturada");
assert(
  css.includes('@import "tw-animate-css"') ||
    css.includes("node_modules/tw-animate-css/dist/tw-animate.css"),
  "import tw-animate-css",
);
assert(
  css.includes('@import "shadcn/tailwind.css"') ||
    css.includes("node_modules/shadcn/dist/tailwind.css"),
  "import shadcn/tailwind.css",
);assert(css.includes("@theme inline"), "@theme inline (TW4)");
assert(css.includes("@custom-variant dark"), "@custom-variant dark");
assert(css.includes("--surface-raised"), "token --surface-raised");
assert(css.includes("--border-premium"), "token --border-premium");
assert(css.includes("--motion-fast"), "token --motion-fast");
assert(css.includes("--glow-gold"), "token --glow-gold");
assert(css.includes("--ease-premium"), "token --ease-premium");
assert(css.includes(".premium-enter"), "classe premium-enter");
assert(!css.includes("```"), "sem markdown/crases no CSS");
assert(!/Unexpected end of JSON/.test(css), "CSS sem lixo de erro JSON");

let brace = 0;
for (const ch of css) {
  if (ch === "{") brace++;
  if (ch === "}") brace--;
}
assert(brace === 0, "chaves CSS balanceadas");

try {
  const postcss = (await import("postcss")).default;
  const cfgMod = await import(pathToFileURL(postcssPath).href);
  const cfg = cfgMod.default ?? cfgMod;
  const plugins = [];
  for (const [name, opts] of Object.entries(cfg.plugins ?? {})) {
    const mod = await import(name);
    const factory = mod.default ?? mod;
    plugins.push(typeof factory === "function" ? factory(opts) : factory);
  }
  const result = await postcss(plugins).process(css, { from: cssPath });
  assert(typeof result.css === "string" && result.css.length > 1000, "PostCSS processou globals.css");
  assert(
    !/Unexpected end of JSON input/i.test(result.css),
    "output PostCSS sem erro JSON",
  );
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  assert(false, `PostCSS/Tailwind falhou: ${msg.split("\n")[0]}`);
  if (/package\.json/i.test(msg) && /Unexpected end of JSON/i.test(msg)) {
    console.log(
      "  NOTE  Causa raiz típica: package.json truncado durante resolução @import tailwindcss",
    );
  }
}

// Resolver package.json do próprio tailwind (mesmo caminho que o plugin usa)
try {
  const twPkg = require.resolve("tailwindcss/package.json");
  JSON.parse(readFileSync(twPkg, "utf8"));
  assert(true, "tailwindcss/package.json válido");
} catch (e) {
  assert(false, `tailwindcss/package.json: ${e instanceof Error ? e.message : e}`);
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
