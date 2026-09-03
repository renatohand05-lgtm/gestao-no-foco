"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isCommercialPlanSlug } from "@/lib/billing/catalog";
import { isPlatformOwner } from "@/lib/platform/platform-access-service";
import {
  PLAN_SIM_COOKIE,
  PLAN_SIM_MAX_AGE_SECONDS,
} from "@/lib/platform/plan-simulation";

/**
 * Ativa a simulação e navega direto pro tenant. Só o dono da plataforma
 * pode chamar isto — qualquer outra sessão é ignorada silenciosamente, sem
 * ativar nada nem revelar que o recurso existe.
 */
export async function startPlanSimulationAction(
  planSlug: string,
  tenantSlug: string,
): Promise<void> {
  const isOwner = await isPlatformOwner();
  if (!isOwner) return;
  if (!isCommercialPlanSlug(planSlug)) return;

  const store = await cookies();
  store.set(PLAN_SIM_COOKIE, planSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: PLAN_SIM_MAX_AGE_SECONDS,
  });
  redirect(`/${tenantSlug}/dashboard`);
}

export async function stopPlanSimulationAction(): Promise<void> {
  const store = await cookies();
  store.delete(PLAN_SIM_COOKIE);
  redirect("/master/plano-preview");
}
