/**
 * Sprint 25.3 — Central de Importação de Catálogos / Produtos / Estoque / NF.
 */

export {
  CATALOG_REFERENCE_HOUR_RATES,
  PRICE_BAND_LABELS,
  computeServicePrice,
  estimateMargin,
  previewPriceRecalc,
  resolveHourRate,
  assertValidHourRates,
  formatBrl,
  type PriceBandId,
  type PriceBandRates,
} from "./price-bands.ts";

export {
  catalogFileExists,
  filterCatalogServices,
  getCatalogFilePath,
  loadPlatformServiceCatalog,
  materializeCatalogPrices,
  type CatalogFilter,
  type CatalogServiceRow,
} from "./catalog-source.ts";

export {
  buildProductStockTemplate,
  buildServiceCatalogExport,
  type ExportFormat,
} from "./catalog-export.ts";

export {
  findProductDuplicates,
  findServiceDuplicates,
  normalizeName,
  type DuplicateDecision,
  type DuplicateMatch,
} from "./duplicate-resolver.ts";

export {
  buildCatalogPreviewSummary,
  sumFinite,
  type CatalogImportPreviewSummary,
} from "./preview-summary.ts";

/* invoice-bridge: importar de ./invoice-bridge.ts (parser NF-e) */
