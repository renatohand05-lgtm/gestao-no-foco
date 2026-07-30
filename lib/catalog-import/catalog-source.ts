/**
 * Sprint 25.3 — Fonte do catálogo padrão de serviços (arquivo editável).
 * Não hardcodar preços como verdade universal.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

import {
  CATALOG_REFERENCE_HOUR_RATES,
  computeServicePrice,
  type PriceBandId,
  type PriceBandRates,
} from "./price-bands.ts";

export type CatalogServiceRow = {
  codigo_servico: string;
  categoria: string;
  subcategoria: string | null;
  nome_servico: string;
  descricao_curta: string | null;
  prioridade_comercial: string | null;
  frequencia_estimada: string | null;
  tempo_padrao_h: number | null;
  tempo_minimo_h: number | null;
  tempo_maximo_h: number | null;
  complexidade: string | null;
  hora_tecnica_economica: number | null;
  hora_tecnica_popular: number | null;
  hora_tecnica_estruturada: number | null;
  hora_tecnica_especializada: number | null;
  valor_economico: number | null;
  valor_popular_recomendado: number | null;
  valor_estruturado: number | null;
  valor_especializado: number | null;
  elevador_necessario: string | null;
  scanner_necessario: string | null;
  alinhamento_apos_servico: string | null;
  teste_rodagem: string | null;
  quantidade_mecanicos: number | null;
  garantia_dias: number | null;
  status: string | null;
  regiao_referencia: string | null;
  observacao_tecnica: string | null;
};

export type CatalogCategoryRow = {
  codigo_categoria: string;
  categoria: string;
  quantidade_servicos: number | null;
  prioridade_dominante: string | null;
  status: string | null;
};

export type CatalogPremiseRow = {
  premissa: string;
  valor: string | number | null;
  uso: string | null;
  observacao: string | null;
};

function catalogPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../data/catalogs/servicos-zona-sul-sp.xlsx");
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

let cache: {
  services: CatalogServiceRow[];
  categories: CatalogCategoryRow[];
  premises: CatalogPremiseRow[];
  rates: PriceBandRates;
} | null = null;

export function getCatalogFilePath(): string {
  return catalogPath();
}

export function catalogFileExists(): boolean {
  return existsSync(catalogPath());
}

function loadWorkbook() {
  const path = catalogPath();
  if (!existsSync(path)) {
    throw new Error(
      "Catálogo padrão ausente — data/catalogs/servicos-zona-sul-sp.xlsx",
    );
  }
  return XLSX.read(readFileSync(path));
}

function parseRatesFromPremises(
  premises: CatalogPremiseRow[],
): PriceBandRates {
  const rates = { ...CATALOG_REFERENCE_HOUR_RATES };
  for (const p of premises) {
    const label = (p.premissa ?? "").toLowerCase();
    const valor = num(p.valor);
    if (valor == null) continue;
    if (label.includes("economica") || label.includes("econômica")) {
      rates.economico = valor;
    } else if (label.includes("popular")) {
      rates.popular = valor;
    } else if (label.includes("estruturada") || label.includes("estruturado")) {
      rates.estruturado = valor;
    } else if (label.includes("especializada") || label.includes("especializado")) {
      rates.especializado = valor;
    }
  }
  return rates;
}

export function loadPlatformServiceCatalog(force = false) {
  if (cache && !force) return cache;
  const wb = loadWorkbook();
  const servicesSheet = wb.Sheets["Importacao_Gestao_no_Foco"];
  const categoriesSheet = wb.Sheets["Categorias"];
  const premisesSheet = wb.Sheets["Premissas"];

  const rawServices = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    servicesSheet,
    { defval: null },
  );
  const services: CatalogServiceRow[] = rawServices.map((r) => ({
    codigo_servico: String(r.codigo_servico ?? "").trim(),
    categoria: String(r.categoria ?? "").trim(),
    subcategoria: str(r.subcategoria),
    nome_servico: String(r.nome_servico ?? "").trim(),
    descricao_curta: str(r.descricao_curta),
    prioridade_comercial: str(r.prioridade_comercial),
    frequencia_estimada: str(r.frequencia_estimada),
    tempo_padrao_h: num(r.tempo_padrao_h),
    tempo_minimo_h: num(r.tempo_minimo_h),
    tempo_maximo_h: num(r.tempo_maximo_h),
    complexidade: str(r.complexidade),
    hora_tecnica_economica: num(r.hora_tecnica_economica),
    hora_tecnica_popular: num(r.hora_tecnica_popular),
    hora_tecnica_estruturada: num(r.hora_tecnica_estruturada),
    hora_tecnica_especializada: num(r.hora_tecnica_especializada),
    valor_economico: num(r.valor_economico),
    valor_popular_recomendado: num(r.valor_popular_recomendado),
    valor_estruturado: num(r.valor_estruturado),
    valor_especializado: num(r.valor_especializado),
    elevador_necessario: str(r.elevador_necessario),
    scanner_necessario: str(r.scanner_necessario),
    alinhamento_apos_servico: str(r.alinhamento_apos_servico),
    teste_rodagem: str(r.teste_rodagem),
    quantidade_mecanicos: num(r.quantidade_mecanicos),
    garantia_dias: num(r.garantia_dias),
    status: str(r.status),
    regiao_referencia: str(r.regiao_referencia),
    observacao_tecnica: str(r.observacao_tecnica),
  })).filter((s) => s.codigo_servico && s.nome_servico);

  const categories = XLSX.utils
    .sheet_to_json<Record<string, unknown>>(categoriesSheet, { defval: null })
    .map((r) => ({
      codigo_categoria: String(r.codigo_categoria ?? "").trim(),
      categoria: String(r.categoria ?? "").trim(),
      quantidade_servicos: num(r.quantidade_servicos),
      prioridade_dominante: str(r.prioridade_dominante),
      status: str(r.status),
    }))
    .filter((c) => c.codigo_categoria);

  const premisesRaw = XLSX.utils.sheet_to_json<unknown[]>(premisesSheet, {
    header: 1,
    defval: null,
  }) as unknown[][];
  const premises: CatalogPremiseRow[] = premisesRaw
    .slice(2)
    .filter((row) => row?.[0])
    .map((row) => ({
      premissa: String(row[0] ?? ""),
      valor: (row[1] as string | number | null) ?? null,
      uso: row[2] != null ? String(row[2]) : null,
      observacao: row[3] != null ? String(row[3]) : null,
    }));

  const rates = parseRatesFromPremises(premises);
  cache = { services, categories, premises, rates };
  return cache;
}

export type CatalogFilter = {
  prioridade?: "A" | "AB" | "all";
  categoria?: string | null;
  complexidade?: string | null;
  emptyTemplate?: boolean;
};

function matchesPrioridade(value: string | null, mode: "A" | "AB" | "all") {
  if (mode === "all") return true;
  const v = (value ?? "").toUpperCase();
  if (mode === "A") return v.startsWith("A");
  return v.startsWith("A") || v.startsWith("B");
}

export function filterCatalogServices(
  filter: CatalogFilter = {},
  catalog = loadPlatformServiceCatalog(),
): CatalogServiceRow[] {
  if (filter.emptyTemplate) return [];
  return catalog.services.filter((s) => {
    if (!matchesPrioridade(s.prioridade_comercial, filter.prioridade ?? "all")) {
      return false;
    }
    if (filter.categoria && s.categoria !== filter.categoria) return false;
    if (
      filter.complexidade &&
      (s.complexidade ?? "").toLowerCase() !==
        filter.complexidade.toLowerCase()
    ) {
      return false;
    }
    return true;
  });
}

export function materializeCatalogPrices(
  rows: CatalogServiceRow[],
  band: PriceBandId,
  rates: PriceBandRates,
): Array<CatalogServiceRow & { preco_venda: number | null; preco_fonte: string }> {
  return rows.map((row) => {
    const explicit =
      band === "economico"
        ? row.valor_economico
        : band === "popular"
          ? row.valor_popular_recomendado
          : band === "estruturado"
            ? row.valor_estruturado
            : band === "especializado"
              ? row.valor_especializado
              : null;
    const computed = computeServicePrice({
      tempoPadraoH: row.tempo_padrao_h,
      band,
      rates,
      explicitPrice: explicit,
    });
    return {
      ...row,
      preco_venda: computed.price,
      preco_fonte: computed.source,
    };
  });
}
