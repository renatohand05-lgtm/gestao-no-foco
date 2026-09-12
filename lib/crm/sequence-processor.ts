import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendViaChannelProvider } from "@/lib/retention/dispatch";

type DueEnrollment = {
  id: string;
  tenant_id: string;
  sequence_id: string;
  cliente_id: string;
  current_step_ordem: number;
};

type Step = {
  id: string;
  ordem: number;
  delay_dias: number;
  canal: "whatsapp" | "email";
  mensagem: string;
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * Processa todas as inscrições vencidas de todos os tenants — pensado
 * pra rodar via cron (Vercel Cron), não por request de usuário.
 */
export async function processDueCrmSequences(
  supabaseAdmin: SupabaseClient,
  now = new Date(),
): Promise<{ processed: number; sent: number; failed: number; completed: number }> {
  const { data: due, error } = await supabaseAdmin
    .from("crm_sequence_enrollments" as never)
    .select("id, tenant_id, sequence_id, cliente_id, current_step_ordem")
    .eq("status", "ativo")
    .lte("next_dispatch_at", now.toISOString())
    .limit(200);

  if (error) throw new Error(error.message);

  const enrollments = (due ?? []) as unknown as DueEnrollment[];
  let sent = 0;
  let failed = 0;
  let completed = 0;

  for (const enrollment of enrollments) {
    try {
      const result = await processOneEnrollment(supabaseAdmin, enrollment, now);
      if (result === "sent") sent += 1;
      else if (result === "failed") failed += 1;
      else if (result === "completed") completed += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed: enrollments.length, sent, failed, completed };
}

async function processOneEnrollment(
  supabase: SupabaseClient,
  enrollment: DueEnrollment,
  now: Date,
): Promise<"sent" | "failed" | "completed"> {
  const { data: steps } = await supabase
    .from("crm_sequence_steps" as never)
    .select("id, ordem, delay_dias, canal, mensagem")
    .eq("sequence_id", enrollment.sequence_id)
    .order("ordem", { ascending: true });

  const stepList = (steps ?? []) as unknown as Step[];
  const currentStep = stepList.find((s) => s.ordem === enrollment.current_step_ordem);

  if (!currentStep) {
    await supabase
      .from("crm_sequence_enrollments" as never)
      .update({ status: "concluido", completed_at: now.toISOString() } as never)
      .eq("id", enrollment.id);
    return "completed";
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome, telefone, whatsapp, email")
    .eq("id", enrollment.cliente_id)
    .maybeSingle<{
      nome: string;
      telefone: string | null;
      whatsapp: string | null;
      email: string | null;
    }>();

  const to =
    currentStep.canal === "whatsapp"
      ? (cliente?.whatsapp ?? cliente?.telefone ?? null)
      : (cliente?.email ?? null);

  if (!to) {
    await logDispatch(supabase, enrollment, currentStep, "skipped", "Cliente sem contato para o canal.");
    await advanceEnrollment(supabase, enrollment, stepList, currentStep, now);
    return "failed";
  }

  const body = fillTemplate(currentStep.mensagem, { nome: cliente?.nome ?? "" });

  const result = await sendViaChannelProvider({
    channel: currentStep.canal,
    to,
    body,
    tenantId: enrollment.tenant_id,
    event: "crm_sequence_step",
  });

  await logDispatch(
    supabase,
    enrollment,
    currentStep,
    result.status === "sent" ? "sent" : result.status === "failed" ? "failed" : "blocked",
    result.message,
    result.providerMessageId,
  );

  await advanceEnrollment(supabase, enrollment, stepList, currentStep, now);

  return result.status === "sent" ? "sent" : "failed";
}

async function advanceEnrollment(
  supabase: SupabaseClient,
  enrollment: DueEnrollment,
  stepList: Step[],
  currentStep: Step,
  now: Date,
): Promise<void> {
  const nextStep = stepList.find((s) => s.ordem === currentStep.ordem + 1);

  if (!nextStep) {
    await supabase
      .from("crm_sequence_enrollments" as never)
      .update({ status: "concluido", completed_at: now.toISOString() } as never)
      .eq("id", enrollment.id);
    return;
  }

  const nextDispatchAt = new Date(
    now.getTime() + nextStep.delay_dias * 24 * 60 * 60 * 1000,
  ).toISOString();

  await supabase
    .from("crm_sequence_enrollments" as never)
    .update({
      current_step_ordem: nextStep.ordem,
      next_dispatch_at: nextDispatchAt,
    } as never)
    .eq("id", enrollment.id);
}

async function logDispatch(
  supabase: SupabaseClient,
  enrollment: DueEnrollment,
  step: Step,
  status: "sent" | "failed" | "skipped" | "blocked",
  message?: string,
  providerMessageId?: string,
): Promise<void> {
  await supabase.from("crm_sequence_dispatch_log" as never).insert({
    tenant_id: enrollment.tenant_id,
    enrollment_id: enrollment.id,
    step_id: step.id,
    status,
    provider_message_id: providerMessageId ?? null,
    error_message: status === "failed" || status === "skipped" ? (message ?? null) : null,
  } as never);
}
