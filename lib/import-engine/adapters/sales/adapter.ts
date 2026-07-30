import type { ModuleImportAdapter } from "../shared/module-adapter.ts";
import { SALES_IMPORT_ENTITY, SALES_IMPORT_FIELDS, SALES_IMPORT_MODULE } from "./fields.ts";

export const SALES_IMPORT_ADAPTER: ModuleImportAdapter = {
  id: "sales",
  moduleKey: SALES_IMPORT_MODULE,
  label: "Vendas",
  targetEntity: SALES_IMPORT_ENTITY,
  fields: SALES_IMPORT_FIELDS,
  classificationDomain: "sales",
  requiredPermission: "vendas.criar",
};
