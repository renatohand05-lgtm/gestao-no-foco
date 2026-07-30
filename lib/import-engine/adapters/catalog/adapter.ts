import type { ModuleImportAdapter } from "../shared/module-adapter.ts";
import {
  CATALOG_IMPORT_ENTITY,
  CATALOG_IMPORT_MODULE,
  CATALOG_SERVICE_IMPORT_FIELDS,
} from "./fields.ts";

export const CATALOG_IMPORT_ADAPTER: ModuleImportAdapter = {
  id: "catalog",
  moduleKey: CATALOG_IMPORT_MODULE,
  label: "Catálogo de serviços",
  targetEntity: CATALOG_IMPORT_ENTITY,
  fields: CATALOG_SERVICE_IMPORT_FIELDS,
  classificationDomain: "catalog",
  requiredPermission: "servicos.importar",
};
