/**
 * Sprint 35.0 — Capabilities de produto.
 * Módulos consultam isto (não o nome do segmento).
 * RBAC continua sendo a autoridade de acesso.
 */

export const PRODUCT_CAPABILITIES = [
  "appointments",
  "customers",
  "vehicles",
  "work_orders",
  "workshop_mechanics",
  "professionals",
  "commissions",
  "inventory",
  "service_checklist",
  "recurring_services",
  "patient_records",
  "treatment_plans",
  "financial_management",
  "sales",
  "purchases",
  "crm",
  "catalog",
  "operations_board",
  "reports",
] as const;

export type ProductCapability = (typeof PRODUCT_CAPABILITIES)[number];

export function isProductCapability(
  value: string | null | undefined,
): value is ProductCapability {
  if (!value) return false;
  return (PRODUCT_CAPABILITIES as readonly string[]).includes(value);
}

/** Capabilities sempre presentes no produto (relevância, não segurança). */
export const BASE_CAPABILITIES: readonly ProductCapability[] = [
  "customers",
  "financial_management",
  "reports",
  "catalog",
];
