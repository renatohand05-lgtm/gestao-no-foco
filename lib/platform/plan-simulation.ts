import "server-only";

import { cookies } from "next/headers";

import { isCommercialPlanSlug } from "@/lib/billing/catalog";
import { isPlatformOwner } from "@/lib/platform/platform-access-service";

export const PLAN_SIM_COOKIE = "gnf_plan_sim";

/** Cookie curto (4h) — nunca altera o plano real do tenant, é só uma lente de visualização, só pro dono. */
export const PLAN_SIM_MAX_AGE_SECONDS = 4 * 60 * 60;

/** Lê o plano simulado ativo — só retorna algo se o usuário for o dono. */
export async function getPlanSimulationSlug(): Promise<string | null> {
  const isOwner = await isPlatformOwner();
  if (!isOwner) return null;
  const store = await cookies();
  const value = store.get(PLAN_SIM_COOKIE)?.value ?? null;
  if (!value || !isCommercialPlanSlug(value)) return null;
  return value;
}
