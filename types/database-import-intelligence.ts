/**
 * Sprint 22.10.1 — Tipos locais das tabelas Import Intelligence + Conciliação.
 * Espelham migrations 20260809 e 20260810. Sem `any`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDef<Row, Insert = Partial<Row> & Record<string, unknown>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ImportRunsTable = TableDef<{
  id: string;
  tenant_id: string;
  user_id: string;
  user_label: string;
  module: string;
  target_entity: string;
  file_name: string;
  format: string;
  origin: string;
  status: string;
  total_rows: number;
  imported_rows: number;
  rejected_rows: number;
  error_count: number;
  duration_ms: number | null;
  mapping_snapshot: Json;
  errors_sample: Json;
  profile_id: string | null;
  profile_name: string | null;
  engine_version: string;
  correlation_id: string | null;
  session_id: string | null;
  rolled_back_at: string | null;
  created_at: string;
}>;

export type ImportProfilesTable = TableDef<{
  id: string;
  tenant_id: string;
  module: string;
  name: string;
  target_entity: string;
  description: string | null;
  format: string | null;
  mapping: Json;
  transformations: Json;
  normalizations: Json;
  rules: Json;
  is_default: boolean;
  import_count: number;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}>;

export type ImportColumnMappingsTable = TableDef<{
  id: string;
  tenant_id: string;
  profile_id: string;
  source_column: string;
  target_field: string;
  confidence: number | null;
  created_at: string;
}>;

export type ImportLearningRulesTable = TableDef<{
  id: string;
  tenant_id: string;
  module: string;
  rule_key: string;
  patterns: Json;
  category_suggested: string;
  subcategory_suggested: string | null;
  cost_center_suggested: string | null;
  dre_group_suggested: string | null;
  supplier_suggested: string | null;
  confidence: number;
  hit_count: number;
  is_active: boolean;
  origin: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}>;

export type ImportRunItemsTable = TableDef<{
  id: string;
  tenant_id: string;
  run_id: string;
  row_number: number;
  target_type: string;
  target_id: string;
  operation: string;
  payload_snapshot: Json;
  created_at: string;
}>;

export type ImportRollbackEventsTable = TableDef<{
  id: string;
  tenant_id: string;
  run_id: string;
  status: string;
  reason: string | null;
  affected_rows: number;
  requested_by: string | null;
  created_at: string;
  completed_at: string | null;
}>;

export type BankReconciliationSessionsTable = TableDef<{
  id: string;
  tenant_id: string;
  bank_account_id: string;
  status: string;
  created_by: string | null;
  closed_by: string | null;
  created_at: string;
  closed_at: string | null;
  notes: string | null;
}>;

export type BankStatementLinesTable = TableDef<{
  id: string;
  tenant_id: string;
  session_id: string | null;
  bank_account_id: string;
  movement_date: string;
  amount: number;
  description: string;
  document_ref: string | null;
  counterparty: string | null;
  external_id: string | null;
  balance_after: number | null;
  import_run_id: string | null;
  created_at: string;
}>;

export type BankReconciliationMatchesTable = TableDef<{
  id: string;
  tenant_id: string;
  session_id: string;
  statement_line_id: string;
  internal_movement_id: string | null;
  status: string;
  confidence: number;
  decision: string;
  justification: string | null;
  criteria: Json;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}>;

/** Tabelas a mesclar em Database["public"]["Tables"]. */
export type ImportIntelligenceTables = {
  import_runs: ImportRunsTable;
  import_profiles: ImportProfilesTable;
  import_column_mappings: ImportColumnMappingsTable;
  import_learning_rules: ImportLearningRulesTable;
  import_run_items: ImportRunItemsTable;
  import_rollback_events: ImportRollbackEventsTable;
  bank_reconciliation_sessions: BankReconciliationSessionsTable;
  bank_statement_lines: BankStatementLinesTable;
  bank_reconciliation_matches: BankReconciliationMatchesTable;
};
