import "server-only";

import { revalidatePath } from "next/cache";

import { actionFail, type ActionResult } from "@/types/action-result";

import { traduzir } from "./acao-comum";
import type { RedeContexto } from "./acesso";

/** Roda a ação e devolve erro legível (nunca estoura para a tela). */
export async function executar<T extends ActionResult>(padrao: string, fn: () => Promise<T>): Promise<T | Extract<ActionResult, { success: false }>> {
  try {
    return await fn();
  } catch (error) {
    return actionFail(traduzir(error, padrao));
  }
}

export function atualizar(slug: string): void {
  revalidatePath(`/${slug}/rede`, "layout");
}

/** A loja precisa ser da empresa e estar no acesso da pessoa (o banco filtra; aqui a regra fica explícita). */
export async function lojaVisivel(ctx: RedeContexto, lojaId: string) {
  const { data: row, error } = await ctx.db.from("rede_lojas").select("id,nome,status").eq("id", lojaId).eq("tenant_id", ctx.tenant.id).maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Loja não encontrada ou sem acesso.");
  return row as { id: string; nome: string; status: string };
}
