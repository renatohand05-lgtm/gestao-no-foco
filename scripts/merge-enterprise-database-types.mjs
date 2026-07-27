#!/usr/bin/env node
/**
 * RC7 — Mescla Tables Enterprise em types/database.ts (schema das migrations 20260807).
 * Executar: node scripts/merge-enterprise-database-types.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve("types/database.ts");
let src = readFileSync(path, "utf8");

if (src.includes("audit_events:")) {
  console.log("SKIP: audit_events já presente em database.ts");
  process.exit(0);
}

const enterpriseTables = `
      approval_decisions: {
        Row: {
          id: string;
          tenant_id: string;
          approval_request_id: string;
          level_id: string | null;
          approver_actor_type: string;
          approver_id: string | null;
          approver_system_key: string | null;
          approver_role: string | null;
          decision: string;
          reason: string | null;
          metadata: Json;
          correlation_id: string | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          approval_request_id: string;
          level_id?: string | null;
          approver_actor_type?: string;
          approver_id?: string | null;
          approver_system_key?: string | null;
          approver_role?: string | null;
          decision: string;
          reason?: string | null;
          metadata?: Json;
          correlation_id?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          approval_request_id?: string;
          level_id?: string | null;
          approver_actor_type?: string;
          approver_id?: string | null;
          approver_system_key?: string | null;
          approver_role?: string | null;
          decision?: string;
          reason?: string | null;
          metadata?: Json;
          correlation_id?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      approval_definitions: {
        Row: {
          id: string;
          tenant_id: string | null;
          approval_key: string;
          version: string;
          name: string;
          description: string | null;
          definition: Json;
          status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          approval_key: string;
          version: string;
          name: string;
          description?: string | null;
          definition?: Json;
          status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          approval_key?: string;
          version?: string;
          name?: string;
          description?: string | null;
          definition?: Json;
          status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      approval_history: {
        Row: {
          id: string;
          tenant_id: string;
          approval_request_id: string;
          previous_status: string | null;
          new_status: string;
          event: string;
          actor_type: string;
          actor_id: string | null;
          system_actor_key: string | null;
          reason: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          approval_request_id: string;
          previous_status?: string | null;
          new_status: string;
          event: string;
          actor_type?: string;
          actor_id?: string | null;
          system_actor_key?: string | null;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          approval_request_id?: string;
          previous_status?: string | null;
          new_status?: string;
          event?: string;
          actor_type?: string;
          actor_id?: string | null;
          system_actor_key?: string | null;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      approval_pending_actions: {
        Row: {
          id: string;
          tenant_id: string;
          approval_request_id: string;
          action_type: string;
          payload: Json;
          status: string;
          attempts: number;
          scheduled_at: string | null;
          processed_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          approval_request_id: string;
          action_type: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          scheduled_at?: string | null;
          processed_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          approval_request_id?: string;
          action_type?: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          scheduled_at?: string | null;
          processed_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      approval_requests: {
        Row: {
          id: string;
          tenant_id: string;
          approval_definition_id: string;
          approval_key: string;
          approval_version: string;
          requester_actor_type: string;
          requester_id: string | null;
          requester_system_key: string | null;
          target_type: string | null;
          target_id: string | null;
          amount: number | null;
          currency: string | null;
          current_level: string | null;
          status: string;
          data: Json;
          metadata: Json;
          correlation_id: string | null;
          expires_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          approval_definition_id: string;
          approval_key: string;
          approval_version: string;
          requester_actor_type?: string;
          requester_id?: string | null;
          requester_system_key?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          current_level?: string | null;
          status: string;
          data?: Json;
          metadata?: Json;
          correlation_id?: string | null;
          expires_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          approval_definition_id?: string;
          approval_key?: string;
          approval_version?: string;
          requester_actor_type?: string;
          requester_id?: string | null;
          requester_system_key?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          current_level?: string | null;
          status?: string;
          data?: Json;
          metadata?: Json;
          correlation_id?: string | null;
          expires_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          actor_type: string;
          system_actor_key: string | null;
          event: string;
          category: string;
          severity: string;
          target_type: string | null;
          target_id: string | null;
          resource: string | null;
          module: string | null;
          description: string | null;
          metadata: Json;
          origin: string | null;
          correlation_id: string | null;
          request_id: string | null;
          session_id: string | null;
          ip_address: string | null;
          device: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          actor_type: string;
          system_actor_key?: string | null;
          event: string;
          category: string;
          severity: string;
          target_type?: string | null;
          target_id?: string | null;
          resource?: string | null;
          module?: string | null;
          description?: string | null;
          metadata?: Json;
          origin?: string | null;
          correlation_id?: string | null;
          request_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          device?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          actor_type?: string;
          system_actor_key?: string | null;
          event?: string;
          category?: string;
          severity?: string;
          target_type?: string | null;
          target_id?: string | null;
          resource?: string | null;
          module?: string | null;
          description?: string | null;
          metadata?: Json;
          origin?: string | null;
          correlation_id?: string | null;
          request_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          device?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
`;

const enterpriseMid = `
      enterprise_idempotency_keys: {
        Row: {
          id: string;
          tenant_id: string;
          idempotency_key: string;
          operation: string;
          request_hash: string;
          response_snapshot: Json | null;
          status: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          idempotency_key: string;
          operation: string;
          request_hash: string;
          response_snapshot?: Json | null;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          idempotency_key?: string;
          operation?: string;
          request_hash?: string;
          response_snapshot?: Json | null;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      enterprise_outbox: {
        Row: {
          id: string;
          tenant_id: string;
          event_type: string;
          aggregate_type: string;
          aggregate_id: string;
          payload: Json;
          status: string;
          attempts: number;
          max_attempts: number;
          correlation_id: string | null;
          request_id: string | null;
          available_at: string;
          locked_at: string | null;
          locked_by: string | null;
          processed_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          event_type: string;
          aggregate_type: string;
          aggregate_id: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          correlation_id?: string | null;
          request_id?: string | null;
          available_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          processed_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          event_type?: string;
          aggregate_type?: string;
          aggregate_id?: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          correlation_id?: string | null;
          request_id?: string | null;
          available_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          processed_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
`;

const enterpriseNotif = `
      notification_delivery_attempts: {
        Row: {
          id: string;
          tenant_id: string;
          notification_id: string;
          notification_recipient_id: string | null;
          channel: string;
          attempt_number: number;
          status: string;
          error_code: string | null;
          error_message: string | null;
          response_metadata: Json;
          next_attempt_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          notification_id: string;
          notification_recipient_id?: string | null;
          channel: string;
          attempt_number?: number;
          status: string;
          error_code?: string | null;
          error_message?: string | null;
          response_metadata?: Json;
          next_attempt_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          notification_id?: string;
          notification_recipient_id?: string | null;
          channel?: string;
          attempt_number?: number;
          status?: string;
          error_code?: string | null;
          error_message?: string | null;
          response_metadata?: Json;
          next_attempt_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          enabled_channels: Json;
          allowed_categories: Json;
          minimum_priority: string;
          quiet_hours: Json;
          digest_mode: string | null;
          language: string | null;
          timezone: string | null;
          opt_out: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          enabled_channels?: Json;
          allowed_categories?: Json;
          minimum_priority?: string;
          quiet_hours?: Json;
          digest_mode?: string | null;
          language?: string | null;
          timezone?: string | null;
          opt_out?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          enabled_channels?: Json;
          allowed_categories?: Json;
          minimum_priority?: string;
          quiet_hours?: Json;
          digest_mode?: string | null;
          language?: string | null;
          timezone?: string | null;
          opt_out?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_recipients: {
        Row: {
          id: string;
          tenant_id: string;
          notification_id: string;
          recipient_type: string;
          recipient_id: string;
          channel: string;
          status: string;
          read_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          notification_id: string;
          recipient_type: string;
          recipient_id: string;
          channel: string;
          status: string;
          read_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          notification_id?: string;
          recipient_type?: string;
          recipient_id?: string;
          channel?: string;
          status?: string;
          read_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_templates: {
        Row: {
          id: string;
          tenant_id: string | null;
          template_key: string;
          version: string;
          event: string;
          category: string;
          supported_channels: Json;
          title_template: string;
          message_template: string;
          variables_schema: Json;
          metadata: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          template_key: string;
          version: string;
          event: string;
          category: string;
          supported_channels?: Json;
          title_template: string;
          message_template: string;
          variables_schema?: Json;
          metadata?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          template_key?: string;
          version?: string;
          event?: string;
          category?: string;
          supported_channels?: Json;
          title_template?: string;
          message_template?: string;
          variables_schema?: Json;
          metadata?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          tenant_id: string;
          event: string;
          category: string;
          priority: string;
          title: string;
          message: string;
          status: string;
          template_id: string | null;
          source: string | null;
          metadata: Json;
          correlation_id: string | null;
          request_id: string | null;
          scheduled_at: string | null;
          expires_at: string | null;
          deduplication_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          event: string;
          category: string;
          priority?: string;
          title: string;
          message: string;
          status: string;
          template_id?: string | null;
          source?: string | null;
          metadata?: Json;
          correlation_id?: string | null;
          request_id?: string | null;
          scheduled_at?: string | null;
          expires_at?: string | null;
          deduplication_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          event?: string;
          category?: string;
          priority?: string;
          title?: string;
          message?: string;
          status?: string;
          template_id?: string | null;
          source?: string | null;
          metadata?: Json;
          correlation_id?: string | null;
          request_id?: string | null;
          scheduled_at?: string | null;
          expires_at?: string | null;
          deduplication_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
`;

const enterpriseRbac = `
      tenant_rbac_role_permissions: {
        Row: {
          id: string;
          tenant_id: string;
          role_id: string;
          permission_key: string;
          effect: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          role_id: string;
          permission_key: string;
          effect?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          role_id?: string;
          permission_key?: string;
          effect?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tenant_roles: {
        Row: {
          id: string;
          tenant_id: string;
          role_key: string;
          name: string;
          description: string | null;
          level: number;
          type: string;
          is_system: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          role_key: string;
          name: string;
          description?: string | null;
          level?: number;
          type?: string;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          role_key?: string;
          name?: string;
          description?: string | null;
          level?: number;
          type?: string;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_user_permission_overrides: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          permission_key: string;
          effect: string;
          reason: string | null;
          created_by: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          permission_key: string;
          effect: string;
          reason?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          permission_key?: string;
          effect?: string;
          reason?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tenant_user_roles: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
`;

const enterpriseWorkflow = `
      workflow_definitions: {
        Row: {
          id: string;
          tenant_id: string | null;
          workflow_key: string;
          version: string;
          name: string;
          description: string | null;
          definition: Json;
          status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          workflow_key: string;
          version: string;
          name: string;
          description?: string | null;
          definition?: Json;
          status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          workflow_key?: string;
          version?: string;
          name?: string;
          description?: string | null;
          definition?: Json;
          status?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_history: {
        Row: {
          id: string;
          tenant_id: string;
          workflow_instance_id: string;
          transition_id: string | null;
          event: string;
          from_state: string | null;
          to_state: string | null;
          actor_type: string;
          actor_id: string | null;
          system_actor_key: string | null;
          reason: string | null;
          metadata: Json;
          correlation_id: string | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          workflow_instance_id: string;
          transition_id?: string | null;
          event: string;
          from_state?: string | null;
          to_state?: string | null;
          actor_type?: string;
          actor_id?: string | null;
          system_actor_key?: string | null;
          reason?: string | null;
          metadata?: Json;
          correlation_id?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          workflow_instance_id?: string;
          transition_id?: string | null;
          event?: string;
          from_state?: string | null;
          to_state?: string | null;
          actor_type?: string;
          actor_id?: string | null;
          system_actor_key?: string | null;
          reason?: string | null;
          metadata?: Json;
          correlation_id?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workflow_instances: {
        Row: {
          id: string;
          tenant_id: string;
          workflow_definition_id: string;
          workflow_key: string;
          workflow_version: string;
          current_state: string;
          status: string;
          target_type: string | null;
          target_id: string | null;
          data: Json;
          metadata: Json;
          correlation_id: string | null;
          transition_count: number;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          workflow_definition_id: string;
          workflow_key: string;
          workflow_version: string;
          current_state: string;
          status: string;
          target_type?: string | null;
          target_id?: string | null;
          data?: Json;
          metadata?: Json;
          correlation_id?: string | null;
          transition_count?: number;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          workflow_definition_id?: string;
          workflow_key?: string;
          workflow_version?: string;
          current_state?: string;
          status?: string;
          target_type?: string | null;
          target_id?: string | null;
          data?: Json;
          metadata?: Json;
          correlation_id?: string | null;
          transition_count?: number;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_pending_actions: {
        Row: {
          id: string;
          tenant_id: string;
          workflow_instance_id: string;
          action_type: string;
          payload: Json;
          status: string;
          attempts: number;
          last_error: string | null;
          scheduled_at: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          workflow_instance_id: string;
          action_type: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          last_error?: string | null;
          scheduled_at?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          workflow_instance_id?: string;
          action_type?: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          last_error?: string | null;
          scheduled_at?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
`;

src = src.replace(
  "      clientes: {",
  `${enterpriseTables}      clientes: {`,
);
src = src.replace(
  "      financeiro_lancamento_eventos: {",
  `${enterpriseMid}      financeiro_lancamento_eventos: {`,
);
src = src.replace(
  "      oficina_textos: {",
  `${enterpriseNotif}      oficina_textos: {`,
);
src = src.replace(
  "      venda_devolucoes: {",
  `${enterpriseRbac}      venda_devolucoes: {`,
);
src = src.replace(
  "    };\n    Views: Record<string, never>;",
  `${enterpriseWorkflow}    };\n    Views: Record<string, never>;`,
);

writeFileSync(path, src, "utf8");
console.log("OK: 21 tabelas Enterprise mescladas em types/database.ts");
