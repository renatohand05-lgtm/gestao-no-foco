import type { ModuleImportAdapter } from "../shared/module-adapter.ts";
import {
  SERVICE_ORDERS_IMPORT_ENTITY,
  SERVICE_ORDERS_IMPORT_FIELDS,
  SERVICE_ORDERS_IMPORT_MODULE,
} from "./fields.ts";

export const SERVICE_ORDERS_IMPORT_ADAPTER: ModuleImportAdapter = {
  id: "service-orders",
  moduleKey: SERVICE_ORDERS_IMPORT_MODULE,
  label: "Ordens de Serviço",
  targetEntity: SERVICE_ORDERS_IMPORT_ENTITY,
  fields: SERVICE_ORDERS_IMPORT_FIELDS,
  classificationDomain: "service-orders",
  requiredPermission: "os.criar",
};
