import type { ModuleImportAdapter } from "../shared/module-adapter.ts";
import {
  INVOICE_IMPORT_ENTITY,
  INVOICE_IMPORT_FIELDS,
  INVOICE_IMPORT_MODULE,
} from "./fields.ts";

export const INVOICE_IMPORT_ADAPTER: ModuleImportAdapter = {
  id: "invoice",
  moduleKey: INVOICE_IMPORT_MODULE,
  label: "Notas fiscais de entrada",
  targetEntity: INVOICE_IMPORT_ENTITY,
  fields: INVOICE_IMPORT_FIELDS,
  classificationDomain: "invoice",
  requiredPermission: "compras.receber",
};
