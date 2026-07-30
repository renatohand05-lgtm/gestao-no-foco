/**
 * Sprint 22.5.1 — Contrato comum a todo módulo consumidor da Import Engine.
 * Um `ModuleImportAdapter` descreve APENAS metadados (campos, permissão,
 * domínio de classificação) — nunca lógica de negócio. As regras de negócio
 * continuam nos serviços de cada módulo (ex.: lib/finance, lib/vendas).
 */
import type {
  ClassificationDomain,
  ImportFieldDef,
  ImportModuleId,
} from "../../types/index.ts";

export type { ImportModuleId };

export type ModuleImportAdapter = {
  id: ImportModuleId;
  moduleKey: string;
  label: string;
  targetEntity: string;
  fields: ImportFieldDef[];
  classificationDomain: ClassificationDomain;
  /** Chave de permissão RBAC exigida para confirmar a importação (ex.: "financeiro.criar"). */
  requiredPermission: string;
};
