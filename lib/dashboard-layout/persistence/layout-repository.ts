/**
 * Repository — acesso Supabase a dashboard_layouts (Sprint 13.6)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapLayoutRow,
  toLayoutSummary,
  type DashboardLayoutRow,
} from "@/lib/dashboard-layout/persistence/layout-mappers";
import type {
  DashboardLayoutRecord,
  DashboardLayoutSummary,
  LayoutDensityProfile,
  PersistedLayoutData,
} from "@/lib/dashboard-layout/persistence/types";
import type { Database } from "@/types/database";

const SELECT =
  "id, tenant_id, user_id, name, preset_key, layout_data, density, is_default, is_active, version, created_at, updated_at, deleted_at";

export class DashboardLayoutRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly userId: string,
  ) {}

  async listSummaries(): Promise<DashboardLayoutSummary[]> {
    const { data, error } = await this.supabase
      .from("dashboard_layouts")
      .select(SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const out: DashboardLayoutSummary[] = [];
    for (const row of data ?? []) {
      const mapped = mapLayoutRow(row as DashboardLayoutRow);
      if (mapped) out.push(toLayoutSummary(mapped));
    }
    return out;
  }

  async getById(id: string): Promise<DashboardLayoutRecord | null> {
    const { data, error } = await this.supabase
      .from("dashboard_layouts")
      .select(SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapLayoutRow(data as DashboardLayoutRow);
  }

  async getDefault(): Promise<DashboardLayoutRecord | null> {
    const { data, error } = await this.supabase
      .from("dashboard_layouts")
      .select(SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("is_default", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapLayoutRow(data as DashboardLayoutRow);
  }

  async getMostRecent(): Promise<DashboardLayoutRecord | null> {
    const { data, error } = await this.supabase
      .from("dashboard_layouts")
      .select(SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapLayoutRow(data as DashboardLayoutRow);
  }

  async insert(input: {
    name: string;
    preset_key: string | null;
    layout_data: PersistedLayoutData;
    density: LayoutDensityProfile | null;
    is_default: boolean;
  }): Promise<DashboardLayoutRecord> {
    const { data, error } = await this.supabase
      .from("dashboard_layouts")
      .insert({
        tenant_id: this.tenantId,
        user_id: this.userId,
        name: input.name,
        preset_key: input.preset_key,
        layout_data: input.layout_data as Database["public"]["Tables"]["dashboard_layouts"]["Insert"]["layout_data"],
        density: input.density,
        is_default: input.is_default,
        is_active: true,
        version: 1,
      })
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    const mapped = mapLayoutRow(data as DashboardLayoutRow);
    if (!mapped) throw new Error("Layout salvo com payload inválido.");
    return mapped;
  }

  async update(
    id: string,
    input: {
      name: string;
      preset_key: string | null;
      layout_data: PersistedLayoutData;
      density: LayoutDensityProfile | null;
      expectedVersion: number;
      nextVersion: number;
    },
  ): Promise<DashboardLayoutRecord> {
    const { data, error } = await this.supabase
      .from("dashboard_layouts")
      .update({
        name: input.name,
        preset_key: input.preset_key,
        layout_data: input.layout_data as Database["public"]["Tables"]["dashboard_layouts"]["Update"]["layout_data"],
        density: input.density,
        version: input.nextVersion,
      })
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("id", id)
      .eq("version", input.expectedVersion)
      .is("deleted_at", null)
      .select(SELECT)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new Error("CONFLICT_VERSION");
    }
    const mapped = mapLayoutRow(data as DashboardLayoutRow);
    if (!mapped) throw new Error("Layout atualizado com payload inválido.");
    return mapped;
  }

  async clearDefaults(): Promise<void> {
    const { error } = await this.supabase
      .from("dashboard_layouts")
      .update({ is_default: false })
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("is_default", true)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async setDefault(id: string): Promise<void> {
    await this.clearDefaults();
    const { error } = await this.supabase
      .from("dashboard_layouts")
      .update({ is_default: true })
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("dashboard_layouts")
      .update({
        deleted_at: new Date().toISOString(),
        is_default: false,
        is_active: false,
      })
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async rename(id: string, name: string): Promise<DashboardLayoutRecord> {
    const { data, error } = await this.supabase
      .from("dashboard_layouts")
      .update({ name })
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    const mapped = mapLayoutRow(data as DashboardLayoutRow);
    if (!mapped) throw new Error("Layout renomeado com payload inválido.");
    return mapped;
  }
}
