#!/usr/bin/env node
/**
 * Gera o catálogo de carros do sistema (marca → modelo → versão → anos) a partir
 * de um arquivo JSON da Tabela FIPE de carros (campos: marca, modelo, ano).
 * Preços NÃO são lidos nem guardados: só nomes e anos.
 *
 * Uso:
 *   node scripts/gerar-catalogo-veiculos.mjs <fipe-carros.json> [referencia]
 *   ex.: node scripts/gerar-catalogo-veiculos.mjs ~/Downloads/db.json 2026-11
 *
 * Saída: lib/veiculos/catalogo/carros.json (já usado pelo cadastro de veículos
 * das oficinas). Depois de gerar, rode `npx tsc --noEmit` e faça o commit.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [, , entrada, referencia = "desconhecida"] = process.argv;
if (!entrada) {
  console.error("Informe o arquivo JSON da FIPE: node scripts/gerar-catalogo-veiculos.mjs <arquivo.json> [referencia]");
  process.exit(1);
}
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const saida = join(raiz, "lib/veiculos/catalogo/carros.json");

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const chave = (s) => semAcento(s).toLowerCase().replace(/\s+/g, " ").trim();
const limpaEspacos = (s) => s.replace(/\s+/g, " ").trim();

/* ---------- marcas ---------- */
const MARCA_NOME = {
  "GM - Chevrolet": "Chevrolet",
  "VW - VolksWagen": "Volkswagen",
  "Kia Motors": "Kia",
  "Caoa Chery/Chery": "Caoa Chery",
  "SSANGYONG": "SsangYong",
  smart: "Smart",
  MINI: "Mini",
};
const MARCA_SIGLAS = new Set(["BMW", "BYD", "BRM", "DFSK", "GAC", "GWM", "JAC", "JPX", "MG", "RAM", "TAC"]);
const MARCAS_POPULARES = [
  "Chevrolet", "Volkswagen", "Fiat", "Ford", "Hyundai", "Toyota", "Honda", "Renault", "Jeep", "Nissan",
  "Peugeot", "Citroën", "Mitsubishi", "Kia", "BMW", "Mercedes-Benz", "Audi", "Volvo", "Land Rover",
  "Suzuki", "Caoa Chery", "BYD", "GWM", "JAC", "RAM", "Subaru", "Mini", "Lexus", "Porsche", "Troller",
];
function nomeMarca(m) {
  if (MARCA_NOME[m]) return MARCA_NOME[m];
  if (m === m.toUpperCase() && !MARCA_SIGLAS.has(m)) {
    return m.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
  return m;
}

/* ---------- modelo (família) ---------- */
const SIGLAS_MODELO = new Set([
  "ASX", "GLA", "GLB", "GLC", "GLE", "GLK", "GLS", "CLA", "CLC", "CLK", "CLS", "SLC", "SLK", "SLS",
  "EQA", "EQB", "EQC", "EQE", "EQS", "AMG", "SUV", "GTI", "HRV",
]);
const VOGAIS = /[AEIOUÁÉÍÓÚÂÊÔÃÕ]/i;
const TITULO_CURTO = new Set(["ka", "fe", "fé", "le"]); // palavras de 2 letras que não são sigla

function tituloParte(p) {
  if (!p) return p;
  if (p.toLowerCase() === "up!") return "up!";
  const up = p.toUpperCase();
  if (SIGLAS_MODELO.has(up)) return up;
  if (/\d/.test(p)) {
    const letras = (p.match(/^[A-Za-zÀ-ÿ]+/) ?? [""])[0].length;
    return letras >= 5 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : up;
  }
  if (TITULO_CURTO.has(p.toLowerCase())) return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  if (p.length <= 2 || !VOGAIS.test(p)) return up;
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}
const tituloModelo = (s) =>
  s
    .split(" ")
    .map((w) => (/^\d+[-–]/.test(w) ? w.toUpperCase() : w.split("-").map(tituloParte).join("-")))
    .join(" ");

const JUNTA_DUAS = new Set(["grand", "santa", "gran", "land", "classe", "new"]);
// nomes compostos conhecidos que a FIPE escreve em palavras separadas
const PARES = [
  ["corolla", "cross"], ["eclipse", "cross"], ["hilux", "sw4"], ["pajero", "sport"], ["space", "wagon"],
  ["pt", "cruiser"], ["del", "rey"], ["club", "wagon"], ["crown", "victoria"], ["le", "baron"],
];
const TRES = [["grand", "santa", "fe"], ["grand", "c4", "picasso"]];
const CLASSES_MERCEDES = new Set(["A", "B", "C", "E", "S", "G", "R", "V", "X"]);
const TRACO = "[-–‑]";

/** Separa o nome da FIPE em { familia, versao }. */
function separar(marca, nomeFipe) {
  const toks = limpaEspacos(nomeFipe).split(" ");
  const base = (t) => chave(t ?? "").split("/")[0];
  const [t0 = "", t1 = ""] = toks;
  const k0 = chave(t0);
  const fim = (familia, resto) => ({
    familia: familia.split("/")[0].replace(/[,;]+$/, "") || t0,
    versao: limpaEspacos(resto.join(" ").replace(/^[\s/,\-–]+/, "")),
  });

  if (marca === "Chrysler" && k0 === "town" && t1 === "&") return fim("Town & Country", toks.slice(3));
  if (marca === "Mercedes-Benz") {
    const h = t0.replace(/\/+$/, "").match(new RegExp(`^([A-Za-z]{1,4})${TRACO}(\\d{1,3}[A-Za-z]*)$`));
    if (h) {
      const letra = h[1].toUpperCase();
      return fim(CLASSES_MERCEDES.has(letra) ? `Classe ${letra}` : letra, [h[2], ...toks.slice(1)]);
    }
    if (/^[A-Za-z]$/.test(t0) && /^\d/.test(t1)) return fim(`Classe ${t0.toUpperCase()}`, toks.slice(1));
  }
  if (marca === "Land Rover" && (k0.startsWith("range") || (k0 === "new" && base(t1).startsWith("range")))) {
    let resto = toks.slice(k0 === "new" ? 2 : 1);
    if (/^rover$|^r\.?$/i.test(resto[0] ?? "")) resto = resto.slice(1);
    return fim("Range Rover", resto);
  }
  if (/^band\./i.test(t0)) return fim("Bandeirante", [t0.slice(5), ...toks.slice(1)]);

  for (const tri of TRES) {
    if (tri.every((w, i) => base(toks[i]) === w)) return fim(toks.slice(0, 3).join(" "), toks.slice(3));
  }
  for (const [a, b] of PARES) {
    if (k0 === a && base(t1) === b) {
      const b0 = t1.split("/")[0];
      return fim(`${t0} ${b0}`, [t1.slice(b0.length), ...toks.slice(2)]);
    }
  }
  if (JUNTA_DUAS.has(k0) && t1 && !/^\d/.test(t1)) {
    const b0 = t1.split("/")[0];
    if (b0) return fim(`${t0} ${b0}`, [t1.slice(b0.length), ...toks.slice(2)]);
  }
  // "Ducato-10 ..." → família "Ducato", versão "10 ..."
  const h = t0.match(new RegExp(`^([A-Za-zÀ-ÿ]{3,})${TRACO}(\\d+.*)$`));
  if (h) return fim(h[1], [h[2], ...toks.slice(1)]);
  return fim(t0, toks.slice(1));
}

/* ---------- versão ---------- */
const MANTER_MAIUSCULO = new Set(["VTEC", "DOHC", "TFSI", "TGDI", "TDCI", "HYBRID", "EXCEL"]);
function limpaVersao(v) {
  return v
    .split(" ")
    .map((w) => {
      const letras = w.replace(/[^A-Za-zÀ-ÿ]/g, "");
      if (letras.length >= 5 && w === w.toUpperCase() && VOGAIS.test(letras) && !MANTER_MAIUSCULO.has(letras.toUpperCase()) && !/\d/.test(w)) {
        return w.charAt(0) + w.slice(1).toLowerCase();
      }
      return w;
    })
    .join(" ");
}

/* ---------- anos ---------- */
function comprimeAnos(set) {
  const a = [...set].sort((x, y) => x - y);
  const partes = [];
  for (let i = 0; i < a.length; ) {
    let j = i;
    while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
    partes.push(j > i ? `${a[i]}-${a[j]}` : `${a[i]}`);
    i = j + 1;
  }
  return partes.join(",");
}

/* ---------- processamento ---------- */
const dados = JSON.parse(readFileSync(entrada, "utf8"));
const linhas = dados.veiculos ?? dados;
if (!Array.isArray(linhas) || !linhas.length) throw new Error("Arquivo sem lista de veículos.");

// marca → famíliaKey → { nome, versoes: Map(chaveVersao → { nome, anos:Set }) }
const arvore = new Map();
for (const l of linhas) {
  if (!l.marca || !l.modelo) continue;
  const marca = nomeMarca(String(l.marca).trim());
  const { familia, versao } = separar(marca, String(l.modelo));
  const fam = familia.endsWith(".") ? familia : tituloModelo(familia);
  const ano = Number.parseInt(String(l.ano), 10);
  if (!arvore.has(marca)) arvore.set(marca, new Map());
  const familias = arvore.get(marca);
  const fk = chave(fam);
  if (!familias.has(fk)) familias.set(fk, { nome: fam, versoes: new Map() });
  const f = familias.get(fk);
  const nomeVersao = limpaVersao(versao) || "Padrão";
  const vk = chave(nomeVersao);
  if (!f.versoes.has(vk)) f.versoes.set(vk, { nome: nomeVersao, anos: new Set() });
  if (ano >= 1950 && ano <= 2100) f.versoes.get(vk).anos.add(ano);
}

// abreviações com ponto ("Defe.", "Disc.") → família completa da mesma marca
for (const familias of arvore.values()) {
  for (const [fk, f] of [...familias]) {
    if (!f.nome.endsWith(".")) continue;
    const prefixo = fk.replace(/\.$/, "");
    const alvo = [...familias.entries()].find(([k, g]) => k !== fk && !g.nome.endsWith(".") && k.startsWith(prefixo));
    if (!alvo) continue;
    for (const [vk, v] of f.versoes) {
      const destino = alvo[1].versoes.get(vk);
      if (destino) v.anos.forEach((a) => destino.anos.add(a));
      else alvo[1].versoes.set(vk, v);
    }
    familias.delete(fk);
  }
}

const ordem = (a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
const marcasOrdenadas = [...arvore.keys()].sort((a, b) => {
  const ia = MARCAS_POPULARES.indexOf(a);
  const ib = MARCAS_POPULARES.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  return ordem(a, b);
});

const marcas = marcasOrdenadas.map((m) => [
  m,
  [...arvore.get(m).values()]
    .sort((a, b) => ordem(a.nome, b.nome))
    .map((f) => [
      f.nome,
      [...f.versoes.values()]
        .sort((a, b) => ordem(a.nome, b.nome))
        .map((v) => [v.nome, comprimeAnos(v.anos)]),
    ]),
]);

const saidaJson = { v: 1, referencia, marcas };
writeFileSync(saida, JSON.stringify(saidaJson));

const nFam = marcas.reduce((s, [, fs]) => s + fs.length, 0);
const nVer = marcas.reduce((s, [, fs]) => s + fs.reduce((t, [, vs]) => t + vs.length, 0), 0);
console.log(`Catálogo gerado: ${marcas.length} marcas, ${nFam} modelos, ${nVer} versões → ${saida}`);
