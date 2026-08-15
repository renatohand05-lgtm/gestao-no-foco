/**
 * @gof/config — flags e shapes de env portáveis (stub 31.0).
 */

export type AppEnv = "development" | "preview" | "production";

export const APP_ENV_VALUES: readonly AppEnv[] = [
  "development",
  "preview",
  "production",
] as const;

export type SegmentId =
  | "oficina"
  | "varejo"
  | "servicos"
  | "generico"
  | "barbearia"
  | "lava_rapido"
  | "consultoria"
  | "clinica_estetica"
  | "consultorio_odontologico";

export const MOCK_TENANTS = [
  { id: "tenant-demo-1", slug: "demo-oficina", name: "Oficina Demo", segmentId: "oficina" as SegmentId },
  { id: "tenant-demo-2", slug: "demo-varejo", name: "Varejo Demo", segmentId: "varejo" as SegmentId },
] as const;

export const MOCK_BRANCHES = [
  { id: "branch-hq", name: "Matriz", tenantId: "tenant-demo-1" },
  { id: "branch-norte", name: "Filial Norte", tenantId: "tenant-demo-1" },
  { id: "branch-centro", name: "Loja Centro", tenantId: "tenant-demo-2" },
] as const;
