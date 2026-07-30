#!/usr/bin/env node
/**
 * Sprint 22.10.1 — Injeta tipagem das tabelas import/conciliação em types/database.ts
 * Idempotente. Não altera migrations.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve("types/database.ts");
let src = readFileSync(path, "utf8");

if (src.includes("import_runs:")) {
  console.log("SKIP: import_runs já presente em database.ts");
  process.exit(0);
}

const marker = "    Views: Record<string, never>;";
if (!src.includes(marker)) {
  console.error("FAIL: marcador Views não encontrado");
  process.exit(1);
}

const block = `
      // —— Sprint 22.10.1 — Import Intelligence + Bank Reconciliation (migrations 20260809/10)
      import_runs: {
        Row: {
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
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          user_label?: string;
          module: string;
          target_entity?: string;
          file_name: string;
          format: string;
          origin?: string;
          status: string;
          total_rows?: number;
          imported_rows?: number;
          rejected_rows?: number;
          error_count?: number;
          duration_ms?: number | null;
          mapping_snapshot?: Json;
          errors_sample?: Json;
          profile_id?: string | null;
          profile_name?: string | null;
          engine_version?: string;
          correlation_id?: string | null;
          session_id?: string | null;
          rolled_back_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          user_label?: string;
          module?: string;
          target_entity?: string;
          file_name?: string;
          format?: string;
          origin?: string;
          status?: string;
          total_rows?: number;
          imported_rows?: number;
          rejected_rows?: number;
          error_count?: number;
          duration_ms?: number | null;
          mapping_snapshot?: Json;
          errors_sample?: Json;
          profile_id?: string | null;
          profile_name?: string | null;
          engine_version?: string;
          correlation_id?: string | null;
          session_id?: string | null;
          rolled_back_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      import_profiles: {
        Row: {
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
        };
        Insert: {
          id?: string;
          tenant_id: string;
          module: string;
          name: string;
          target_entity?: string;
          description?: string | null;
          format?: string | null;
          mapping?: Json;
          transformations?: Json;
          normalizations?: Json;
          rules?: Json;
          is_default?: boolean;
          import_count?: number;
          last_used_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          module?: string;
          name?: string;
          target_entity?: string;
          description?: string | null;
          format?: string | null;
          mapping?: Json;
          transformations?: Json;
          normalizations?: Json;
          rules?: Json;
          is_default?: boolean;
          import_count?: number;
          last_used_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_column_mappings: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          source_column: string;
          target_field: string;
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id: string;
          source_column: string;
          target_field: string;
          confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          profile_id?: string;
          source_column?: string;
          target_field?: string;
          confidence?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      import_learning_rules: {
        Row: {
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
        };
        Insert: {
          id?: string;
          tenant_id: string;
          module: string;
          rule_key: string;
          patterns?: Json;
          category_suggested: string;
          subcategory_suggested?: string | null;
          cost_center_suggested?: string | null;
          dre_group_suggested?: string | null;
          supplier_suggested?: string | null;
          confidence?: number;
          hit_count?: number;
          is_active?: boolean;
          origin?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          module?: string;
          rule_key?: string;
          patterns?: Json;
          category_suggested?: string;
          subcategory_suggested?: string | null;
          cost_center_suggested?: string | null;
          dre_group_suggested?: string | null;
          supplier_suggested?: string | null;
          confidence?: number;
          hit_count?: number;
          is_active?: boolean;
          origin?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_run_items: {
        Row: {
          id: string;
          tenant_id: string;
          run_id: string;
          row_number: number;
          target_type: string;
          target_id: string;
          operation: string;
          payload_snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          run_id: string;
          row_number: number;
          target_type: string;
          target_id: string;
          operation?: string;
          payload_snapshot?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          run_id?: string;
          row_number?: number;
          target_type?: string;
          target_id?: string;
          operation?: string;
          payload_snapshot?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      import_rollback_events: {
        Row: {
          id: string;
          tenant_id: string;
          run_id: string;
          status: string;
          reason: string | null;
          affected_rows: number;
          requested_by: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          run_id: string;
          status: string;
          reason?: string | null;
          affected_rows?: number;
          requested_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          run_id?: string;
          status?: string;
          reason?: string | null;
          affected_rows?: number;
          requested_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      bank_reconciliation_sessions: {
        Row: {
          id: string;
          tenant_id: string;
          bank_account_id: string;
          status: string;
          created_by: string | null;
          closed_by: string | null;
          created_at: string;
          closed_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          bank_account_id: string;
          status?: string;
          created_by?: string | null;
          closed_by?: string | null;
          created_at?: string;
          closed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          bank_account_id?: string;
          status?: string;
          created_by?: string | null;
          closed_by?: string | null;
          created_at?: string;
          closed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      bank_statement_lines: {
        Row: {
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
        };
        Insert: {
          id?: string;
          tenant_id: string;
          session_id?: string | null;
          bank_account_id: string;
          movement_date: string;
          amount: number;
          description?: string;
          document_ref?: string | null;
          counterparty?: string | null;
          external_id?: string | null;
          balance_after?: number | null;
          import_run_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          session_id?: string | null;
          bank_account_id?: string;
          movement_date?: string;
          amount?: number;
          description?: string;
          document_ref?: string | null;
          counterparty?: string | null;
          external_id?: string | null;
          balance_after?: number | null;
          import_run_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bank_reconciliation_matches: {
        Row: {
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
        };
        Insert: {
          id?: string;
          tenant_id: string;
          session_id: string;
          statement_line_id: string;
          internal_movement_id?: string | null;
          status: string;
          confidence?: number;
          decision?: string;
          justification?: string | null;
          criteria?: Json;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          session_id?: string;
          statement_line_id?: string;
          internal_movement_id?: string | null;
          status?: string;
          confidence?: number;
          decision?: string;
          justification?: string | null;
          criteria?: Json;
          decided_by?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
`;

src = src.replace(marker, `${block}\n${marker}`);
writeFileSync(path, src);
console.log("OK: tabelas import/conciliação mescladas em types/database.ts");
