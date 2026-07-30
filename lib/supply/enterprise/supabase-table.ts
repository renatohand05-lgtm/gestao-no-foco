/**
 * Client tipado para tabelas Fase 25.
 * Schema isolado (não depende do nesting legado Tables/Views em database.ts).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Dep = Database["public"]["Tables"]["estoque_depositos"];
type Alm = Database["public"]["Tables"]["estoque_almoxarifados"];
type Loc = Database["public"]["Tables"]["estoque_localizacoes"];
type Ped = Database["public"]["Tables"]["compras_pedidos"];
type Item = Database["public"]["Tables"]["compras_pedido_itens"];
type Cot = Database["public"]["Tables"]["compras_cotacoes"];
type Ev = Database["public"]["Tables"]["compras_eventos"];
type Inv = Database["public"]["Tables"]["estoque_inventarios"];
type InvItem = Database["public"]["Tables"]["estoque_inventario_itens"];

type SupplySchema = {
  public: {
    Tables: {
      estoque_depositos: Dep;
      estoque_almoxarifados: Alm;
      estoque_localizacoes: Loc;
      compras_pedidos: Ped;
      compras_pedido_itens: Item;
      compras_cotacoes: Cot;
      compras_eventos: Ev;
      estoque_inventarios: Inv;
      estoque_inventario_itens: InvItem;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function supplyClient(
  client: SupabaseClient<Database>,
): SupabaseClient<SupplySchema> {
  return client as unknown as SupabaseClient<SupplySchema>;
}
