import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

export type DashboardModo = "normal" | "executivo" | "comercial";

export type DashboardPreferencia = {
  modo: DashboardModo;
  cardsVisiveis: string[];
  layout: Record<string, unknown>;
  fullscreenDefault: boolean;
};

const DEFAULTS: Record<string, DashboardPreferencia> = {
  centro_operacoes: {
    modo: "normal",
    cardsVisiveis: [],
    layout: { order: [] },
    fullscreenDefault: false,
  },
  executivo: {
    modo: "executivo",
    cardsVisiveis: [],
    layout: { order: [] },
    fullscreenDefault: false,
  },
  vendas: {
    modo: "comercial",
    cardsVisiveis: [],
    layout: { order: [] },
    fullscreenDefault: false,
  },
  financeiro: {
    modo: "executivo",
    cardsVisiveis: [],
    layout: { order: [] },
    fullscreenDefault: false,
  },
};

export class DashboardPreferenciasService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly userId: string,
  ) {}

  async get(dashboardTipo: string): Promise<DashboardPreferencia> {
    const fallback = DEFAULTS[dashboardTipo] ?? DEFAULTS.executivo;
    const { data, error } = await this.supabase
      .from("dashboard_usuario_preferencias")
      .select("modo, layout, cards_visiveis")
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("dashboard_tipo", dashboardTipo)
      .maybeSingle();

    if (error || !data) return { ...fallback };

    const layout = (data.layout ?? {}) as Record<string, unknown>;
    return {
      modo: (data.modo as DashboardModo) || fallback.modo,
      cardsVisiveis: data.cards_visiveis ?? [],
      layout,
      fullscreenDefault: Boolean(layout.fullscreenDefault),
    };
  }

  async save(
    dashboardTipo: string,
    pref: Partial<DashboardPreferencia>,
  ): Promise<void> {
    const current = await this.get(dashboardTipo);
    const next: DashboardPreferencia = {
      modo: pref.modo ?? current.modo,
      cardsVisiveis: pref.cardsVisiveis ?? current.cardsVisiveis,
      layout: {
        ...current.layout,
        ...(pref.layout ?? {}),
        fullscreenDefault:
          pref.fullscreenDefault ?? current.fullscreenDefault,
      },
      fullscreenDefault:
        pref.fullscreenDefault ?? current.fullscreenDefault,
    };

    const { data: existing } = await this.supabase
      .from("dashboard_usuario_preferencias")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("dashboard_tipo", dashboardTipo)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await this.supabase
        .from("dashboard_usuario_preferencias")
        .update({
          modo: next.modo,
          cards_visiveis: next.cardsVisiveis,
          layout: next.layout as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await this.supabase
      .from("dashboard_usuario_preferencias")
      .insert({
        tenant_id: this.tenantId,
        user_id: this.userId,
        dashboard_tipo: dashboardTipo,
        modo: next.modo,
        cards_visiveis: next.cardsVisiveis,
        layout: next.layout as Json,
      });
    if (error) throw new Error(error.message);
  }

  async restoreDefault(dashboardTipo: string): Promise<void> {
    const { error } = await this.supabase
      .from("dashboard_usuario_preferencias")
      .delete()
      .eq("tenant_id", this.tenantId)
      .eq("user_id", this.userId)
      .eq("dashboard_tipo", dashboardTipo);
    if (error) throw new Error(error.message);
  }
}

export async function createDashboardPreferenciasService(
  tenantId: string,
  userId: string,
) {
  const supabase = await createClient();
  return new DashboardPreferenciasService(supabase, tenantId, userId);
}
