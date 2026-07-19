export type {
  MasterEntityType,
  MasterSearchHit,
  ContaPagarAutofillSuggestion,
  DedupCheckResult,
  DedupMatch,
  TagRecord,
  MasterEntityTagTarget,
  MasterSuggestionConfidence,
} from "@/lib/master-data/master-data-types";

export {
  normalizeMasterName,
  onlyDigits,
  slugifyTag,
  validateDocumento,
  isBlank,
} from "@/lib/master-data/master-data-validation";

export {
  findFornecedorDuplicates,
  findClienteDuplicates,
  findProdutoDuplicates,
} from "@/lib/master-data/master-data-deduplication";

export {
  suggestContaPagarFromFornecedor,
  mergeAutofillWithoutOverwrite,
} from "@/lib/master-data/master-data-suggestions";

export {
  masterCacheGet,
  masterCacheSet,
  masterCacheInvalidate,
  MASTER_CACHE_BUCKETS,
} from "@/lib/master-data/master-data-cache";

export { MasterDataRepository } from "@/lib/master-data/master-data-repository";
export {
  MasterDataSearchService,
  createMasterDataSearchService,
} from "@/lib/master-data/master-data-search";
export {
  MasterDataService,
  createMasterDataService,
} from "@/lib/master-data/master-data-service";

export {
  MASTER_IMPORT_FIELDS,
  type MasterImportEntity,
  type MasterImportPreview,
  type MasterImportFormat,
} from "@/lib/master-data/master-data-import-types";
