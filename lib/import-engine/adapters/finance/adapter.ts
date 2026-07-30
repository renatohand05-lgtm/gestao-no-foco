import type { ModuleImportAdapter } from "../shared/module-adapter.ts";
import {
  FINANCE_IMPORT_ENTITY,
  FINANCE_IMPORT_MODULE,
  FINANCE_MOVEMENT_IMPORT_FIELDS,
} from "./fields.ts";

export const FINANCE_IMPORT_ADAPTER: ModuleImportAdapter = {
  id: "finance",
  moduleKey: FINANCE_IMPORT_MODULE,
  label: "Financeiro",
  targetEntity: FINANCE_IMPORT_ENTITY,
  fields: FINANCE_MOVEMENT_IMPORT_FIELDS,
  classificationDomain: "finance",
  requiredPermission: "financeiro.criar",
};
