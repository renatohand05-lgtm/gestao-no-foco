import type { ModuleImportAdapter } from "../shared/module-adapter.ts";
import {
  STOCK_IMPORT_ENTITY,
  STOCK_IMPORT_MODULE,
  STOCK_PRODUCT_IMPORT_FIELDS,
} from "./fields.ts";

export const STOCK_IMPORT_ADAPTER: ModuleImportAdapter = {
  id: "stock",
  moduleKey: STOCK_IMPORT_MODULE,
  label: "Produtos e estoque",
  targetEntity: STOCK_IMPORT_ENTITY,
  fields: STOCK_PRODUCT_IMPORT_FIELDS,
  classificationDomain: "stock",
  requiredPermission: "estoque.importar",
};
