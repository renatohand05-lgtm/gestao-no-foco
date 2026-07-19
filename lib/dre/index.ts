export type {
  DreLinhaEconomica,
  DreOrigemEconomica,
  DreLedgerEntry,
  DreTotals,
} from "@/lib/dre/dre-types";

export {
  DRE_LINHA_LABELS,
  DRE_LINHA_OPTIONS,
} from "@/lib/dre/dre-types";

export {
  parseDreLinha,
  resolveDreLinha,
  resolveTipoNatureza,
} from "@/lib/dre/dre-classification";

export { suggestDreLinhaFromName, suggestDreClassificationFromName } from "@/lib/dre/dre-category-mapping";
export type { DreClassificationSuggestion } from "@/lib/dre/dre-category-mapping";

export {
  buildOpexHierarchyNodes,
  principalOpexGrupo,
  buildDreClassificationSelectOptions,
  encodeDreClassification,
  decodeDreClassification,
  formatDreHierarchyPath,
  getDreDetalheDef,
  parseDreDetalhe,
  DRE_OPEX_GRUPO_LABELS,
  DRE_OPEX_GRUPO_ORDER,
  DRE_DETALHE_DEFS,
} from "@/lib/dre/dre-opex-hierarchy";
export type {
  DreOpexGrupo,
  DreDetalheCodigo,
  DreHierarchyNode,
} from "@/lib/dre/dre-opex-hierarchy";

export {
  composeDreTotals,
  toDreResumo,
  buildDreStatementLines,
  filterEntriesByLinha,
  emptyDreTotals,
} from "@/lib/dre/dre-composition";

export {
  validateRateioPercentuais,
  allocateRateioValues,
} from "@/lib/dre/dre-validation";
