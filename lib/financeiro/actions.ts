"use server";

import { revalidatePath } from "next/cache";

import { createCategoriaFinanceiraService } from "@/lib/financeiro/categoria-financeira-service";
import { createCentroCustoService } from "@/lib/financeiro/centro-custo-service";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { createDespesaRecorrenteService } from "@/lib/financeiro/despesa-recorrente-service";
import { createFormaPagamentoService } from "@/lib/financeiro/forma-pagamento-service";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import type { ParcelScope } from "@/lib/financeiro/conta-lifecycle";
import { createMovimentacaoBancariaService } from "@/lib/financeiro/movimentacao-bancaria-service";
import {
  normalizeCategoriaFinanceiraFormValues,
  normalizeCentroCustoFormValues,
  normalizeContaBancariaFormValues,
  normalizeContaPagarFormValues,
  normalizeContaReceberFormValues,
  normalizeEstornarMovimentacaoBancariaFormValues,
  normalizeFormaPagamentoFormValues,
  normalizeMovimentacaoBancariaFormValues,
  normalizePlanoContaFormValues,
  normalizePagarContaFormValues,
  normalizeReceberContaFormValues,
  normalizeTransferenciaBancariaFormValues,
} from "@/lib/financeiro/mappers";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import {
  categoriaFinanceiraFormSchema,
  centroCustoFormSchema,
  classificacaoContaPagarFormSchema,
  classificacaoContaReceberFormSchema,
  contaBancariaFormSchema,
  contaPagarFormSchema,
  contaReceberFormSchema,
  despesaRecorrenteFormSchema,
  estornarMovimentacaoBancariaFormSchema,
  formaPagamentoFormSchema,
  movimentacaoBancariaFormSchema,
  pagarContaFormSchema,
  planoContaFormSchema,
  receberContaFormSchema,
  transferenciaBancariaFormSchema,
} from "@/lib/financeiro/validations";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";
import { toActionError } from "@/lib/supabase/friendly-error";

function failAction(error: unknown, fallback: string): ActionResult {
  return toActionError(error, fallback, "financeiro.action");
}

function revalidateFinanceiroPaths(
  tenantSlug: string,
  segment: string,
  id?: string,
) {
  revalidatePath(`/${tenantSlug}/financeiro`);
  revalidatePath(`/${tenantSlug}/financeiro/${segment}`);

  if (id) {
    revalidatePath(`/${tenantSlug}/financeiro/${segment}/${id}`);
    revalidatePath(`/${tenantSlug}/financeiro/${segment}/${id}/editar`);
  }
}

/* ─── Plano de Contas ─────────────────────────────────────────────── */

export async function createPlanoContaAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = planoContaFormSchema.parse(values);
    const service = await createPlanoContaService(tenant.id);
    const item = await service.create(normalizePlanoContaFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "plano-contas", item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao cadastrar conta.");
  }
}

export async function updatePlanoContaAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = planoContaFormSchema.parse(values);
    const service = await createPlanoContaService(tenant.id);
    await service.update(id, normalizePlanoContaFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "plano-contas", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar conta.");
  }
}

export async function deletePlanoContaAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createPlanoContaService(tenant.id);
    await service.softDelete(id);

    revalidateFinanceiroPaths(tenantSlug, "plano-contas");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir conta.");
  }
}

/* ─── Centros de Custo ────────────────────────────────────────────── */

export async function createCentroCustoAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = centroCustoFormSchema.parse(values);
    const service = await createCentroCustoService(tenant.id);
    const item = await service.create(normalizeCentroCustoFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "centros-custo", item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao cadastrar centro de custo.");
  }
}

export async function updateCentroCustoAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = centroCustoFormSchema.parse(values);
    const service = await createCentroCustoService(tenant.id);
    await service.update(id, normalizeCentroCustoFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "centros-custo", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar centro de custo.");
  }
}

export async function deleteCentroCustoAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createCentroCustoService(tenant.id);
    await service.softDelete(id);

    revalidateFinanceiroPaths(tenantSlug, "centros-custo");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir centro de custo.");
  }
}

/* ─── Contas Bancárias ────────────────────────────────────────────── */

export async function createContaBancariaAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = contaBancariaFormSchema.parse(values);
    const service = await createContaBancariaService(tenant.id);
    const item = await service.create(
      normalizeContaBancariaFormValues(parsed),
    );

    revalidateFinanceiroPaths(tenantSlug, "contas-bancarias", item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao cadastrar conta bancária.");
  }
}

export async function updateContaBancariaAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = contaBancariaFormSchema.parse(values);
    const service = await createContaBancariaService(tenant.id);
    await service.update(id, normalizeContaBancariaFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "contas-bancarias", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar conta bancária.");
  }
}

export async function deleteContaBancariaAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createContaBancariaService(tenant.id);
    await service.softDelete(id);

    revalidateFinanceiroPaths(tenantSlug, "contas-bancarias");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir conta bancária.");
  }
}

/* ─── Formas de Pagamento ─────────────────────────────────────────── */

export async function createFormaPagamentoAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = formaPagamentoFormSchema.parse(values);
    const service = await createFormaPagamentoService(tenant.id);
    const item = await service.create(
      normalizeFormaPagamentoFormValues(parsed),
    );

    revalidateFinanceiroPaths(tenantSlug, "formas-pagamento", item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao cadastrar forma de pagamento.");
  }
}

export async function updateFormaPagamentoAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = formaPagamentoFormSchema.parse(values);
    const service = await createFormaPagamentoService(tenant.id);
    await service.update(id, normalizeFormaPagamentoFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "formas-pagamento", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar forma de pagamento.");
  }
}

export async function deleteFormaPagamentoAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createFormaPagamentoService(tenant.id);
    await service.softDelete(id);

    revalidateFinanceiroPaths(tenantSlug, "formas-pagamento");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir forma de pagamento.");
  }
}

/* ─── Categorias Financeiras ──────────────────────────────────────── */

export async function createCategoriaFinanceiraAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = categoriaFinanceiraFormSchema.parse(values);
    const service = await createCategoriaFinanceiraService(tenant.id);
    const item = await service.create(
      normalizeCategoriaFinanceiraFormValues(parsed),
    );

    revalidateFinanceiroPaths(tenantSlug, "categorias", item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao cadastrar categoria.");
  }
}

export async function updateCategoriaFinanceiraAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = categoriaFinanceiraFormSchema.parse(values);
    const service = await createCategoriaFinanceiraService(tenant.id);
    await service.update(id, normalizeCategoriaFinanceiraFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "categorias", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar categoria.");
  }
}

export async function deleteCategoriaFinanceiraAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createCategoriaFinanceiraService(tenant.id);
    await service.softDelete(id);

    revalidateFinanceiroPaths(tenantSlug, "categorias");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir categoria.");
  }
}

/* ─── Contas a Receber ──────────────────────────────────────────────── */

export async function createContaReceberAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = contaReceberFormSchema.parse(values);
    const service = await createContaReceberService(tenant.id);
    const item = await service.create(normalizeContaReceberFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", item.id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao cadastrar conta a receber.");
  }
}

export async function updateContaReceberAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = contaReceberFormSchema.parse(values);
    const service = await createContaReceberService(tenant.id);
    await service.update(id, normalizeContaReceberFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar conta a receber.");
  }
}

export async function updateClassificacaoContaReceberAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = classificacaoContaReceberFormSchema.parse(values);
    const service = await createContaReceberService(tenant.id);
    await service.updateClassificacao(id, parsed);

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao corrigir classificação da conta a receber.");
  }
}

export async function receberContaReceberAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = receberContaFormSchema.parse(values);
    const service = await createContaReceberService(tenant.id);
    await service.receber(id, normalizeReceberContaFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", id);
    revalidateFluxoCaixaPaths(tenantSlug);
    revalidateFinanceiroPaths(
      tenantSlug,
      "contas-bancarias",
      parsed.conta_bancaria_id,
    );
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao registrar baixa de recebimento.");
  }
}

export async function cancelarContaReceberAction(
  tenantSlug: string,
  id: string,
  options: { motivo?: string; scope?: ParcelScope } = {},
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaReceberService(tenant.id);
    await service.cancelar(id, {
      motivo: options.motivo,
      scope: options.scope,
      userId: user?.id ?? null,
    });

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao cancelar conta a receber.");
  }
}

export async function deleteContaReceberAction(
  tenantSlug: string,
  id: string,
  options: { motivo?: string; scope?: ParcelScope } = {},
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaReceberService(tenant.id);
    await service.softDelete(id, {
      motivo: options.motivo,
      scope: options.scope,
      userId: user?.id ?? null,
    });

    revalidateFinanceiroPaths(tenantSlug, "contas-receber");
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir conta a receber.");
  }
}

export async function estornarContaReceberAction(
  tenantSlug: string,
  id: string,
  values: { motivo: string; data_estorno?: string },
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaReceberService(tenant.id);
    await service.estornarBaixas(id, {
      motivo: values.motivo,
      data_estorno: values.data_estorno,
      userId: user?.id ?? null,
    });

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", id);
    revalidateFluxoCaixaPaths(tenantSlug);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao estornar recebimento.");
  }
}

export async function duplicarContaReceberAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaReceberService(tenant.id);
    const item = await service.duplicar(id, user?.id ?? null);

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", item.id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao duplicar conta a receber.");
  }
}

/* ─── Contas a Pagar ──────────────────────────────────────────────── */

export async function createContaPagarAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = contaPagarFormSchema.parse(values);
    const service = await createContaPagarService(tenant.id);
    const item = await service.create(normalizeContaPagarFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", item.id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao cadastrar conta a pagar.");
  }
}

export async function updateContaPagarAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = contaPagarFormSchema.parse(values);
    const service = await createContaPagarService(tenant.id);
    await service.update(id, normalizeContaPagarFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar conta a pagar.");
  }
}

export async function updateClassificacaoContaPagarAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = classificacaoContaPagarFormSchema.parse(values);
    const service = await createContaPagarService(tenant.id);
    await service.updateClassificacao(id, parsed);

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao corrigir classificação da conta a pagar.");
  }
}

export async function pagarContaPagarAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = pagarContaFormSchema.parse(values);
    const service = await createContaPagarService(tenant.id);
    await service.pagar(id, normalizePagarContaFormValues(parsed));

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", id);
    revalidateFluxoCaixaPaths(tenantSlug);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao registrar baixa de pagamento.");
  }
}

export async function cancelarContaPagarAction(
  tenantSlug: string,
  id: string,
  options: { motivo?: string; scope?: ParcelScope } = {},
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaPagarService(tenant.id);
    await service.cancelar(id, {
      motivo: options.motivo,
      scope: options.scope,
      userId: user?.id ?? null,
    });

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao cancelar conta a pagar.");
  }
}

export async function deleteContaPagarAction(
  tenantSlug: string,
  id: string,
  options: { motivo?: string; scope?: ParcelScope } = {},
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaPagarService(tenant.id);
    await service.softDelete(id, {
      motivo: options.motivo,
      scope: options.scope,
      userId: user?.id ?? null,
    });

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar");
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir conta a pagar.");
  }
}

export async function estornarContaPagarAction(
  tenantSlug: string,
  id: string,
  values: { motivo: string; data_estorno?: string },
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaPagarService(tenant.id);
    await service.estornarBaixas(id, {
      motivo: values.motivo,
      data_estorno: values.data_estorno,
      userId: user?.id ?? null,
    });

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", id);
    revalidateFluxoCaixaPaths(tenantSlug);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao estornar pagamento.");
  }
}

export async function duplicarContaPagarAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const service = await createContaPagarService(tenant.id);
    const item = await service.duplicar(id, user?.id ?? null);

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", item.id);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao duplicar conta a pagar.");
  }
}

/* ─── Fluxo de Caixa / Movimentações Bancárias ─────────────────────── */

function revalidateFluxoCaixaPaths(
  tenantSlug: string,
  movimentacaoId?: string,
) {
  revalidateFinanceiroPaths(tenantSlug, "fluxo-caixa");
  revalidateFinanceiroPaths(tenantSlug, "contas-bancarias");

  if (movimentacaoId) {
    revalidatePath(`/${tenantSlug}/financeiro/fluxo-caixa/${movimentacaoId}`);
  }
}

export async function createMovimentacaoBancariaAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = movimentacaoBancariaFormSchema.parse(values);
    const service = await createMovimentacaoBancariaService(tenant.id);
    const movimentacao = await service.create(
      normalizeMovimentacaoBancariaFormValues(parsed),
      profile?.id ?? null,
    );

    revalidateFluxoCaixaPaths(tenantSlug, movimentacao.id);
    return { success: true, id: movimentacao.id };
  } catch (error) {
    return failAction(error, "Erro ao registrar movimentação bancária.");
  }
}

export async function createTransferenciaBancariaAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = transferenciaBancariaFormSchema.parse(values);
    const service = await createMovimentacaoBancariaService(tenant.id);
    const { enviada } = await service.createTransferencia(
      normalizeTransferenciaBancariaFormValues(parsed),
      profile?.id ?? null,
    );

    revalidateFluxoCaixaPaths(tenantSlug, enviada.id);
    return { success: true, id: enviada.id };
  } catch (error) {
    return failAction(error, "Erro ao registrar transferência bancária.");
  }
}

export async function estornarMovimentacaoBancariaAction(
  tenantSlug: string,
  movimentacaoId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = estornarMovimentacaoBancariaFormSchema.parse(values);
    const service = await createMovimentacaoBancariaService(tenant.id);
    const movimentacao = await service.estornar(
      movimentacaoId,
      normalizeEstornarMovimentacaoBancariaFormValues(parsed),
      profile?.id ?? null,
    );

    revalidateFluxoCaixaPaths(tenantSlug, movimentacao.id);
    return { success: true, id: movimentacao.id };
  } catch (error) {
    return failAction(error, "Erro ao estornar movimentação bancária.");
  }
}

export async function deleteMovimentacaoBancariaAction(
  tenantSlug: string,
  movimentacaoId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createMovimentacaoBancariaService(tenant.id);
    await service.softDelete(movimentacaoId);

    revalidateFluxoCaixaPaths(tenantSlug);
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir movimentação bancária.");
  }
}

/* ─── DRE classification helpers ───────────────────────────────────── */

export async function applySuggestedDreLinhasAction(
  tenantSlug: string,
): Promise<ActionResult & { updated?: number; pendingCount?: number }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const categorias = await createCategoriaFinanceiraService(tenant.id);
    const planos = await createPlanoContaService(tenant.id);
    const [catResult, planoResult] = await Promise.all([
      categorias.applySuggestedDreLinhas(),
      planos.applySuggestedDreLinhas(),
    ]);

    revalidateFinanceiroPaths(tenantSlug, "categorias");
    revalidateFinanceiroPaths(tenantSlug, "plano-contas");
    revalidateFinanceiroPaths(tenantSlug, "dre");

    return {
      success: true,
      updated: catResult.updated + planoResult.updated,
      pendingCount: catResult.pending.length + planoResult.pending.length,
    };
  } catch (error) {
    return failAction(error, "Erro ao aplicar sugestões de linha do DRE.");
  }
}

/* ─── Despesas recorrentes ─────────────────────────────────────────── */

export async function createDespesaRecorrenteAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = despesaRecorrenteFormSchema.parse(values);
    const service = await createDespesaRecorrenteService(tenant.id);
    const item = await service.create({
      descricao: parsed.descricao,
      fornecedor_id: parsed.fornecedor_id || null,
      fornecedor_nome: parsed.fornecedor_nome || null,
      forma_pagamento_id: parsed.forma_pagamento_id || null,
      categoria_financeira_id: parsed.categoria_financeira_id,
      centro_custo_id: parsed.centro_custo_id,
      plano_conta_id: parsed.plano_conta_id,
      valor: parsed.valor,
      dia_vencimento: parsed.dia_vencimento,
      inicia_em: parsed.inicia_em,
      termina_em: parsed.termina_em || null,
      max_ocorrencias: parsed.max_ocorrencias ?? null,
      observacoes: parsed.observacoes || null,
    });

    revalidateFinanceiroPaths(tenantSlug, "despesas-recorrentes", item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao criar recorrência.");
  }
}

export async function updateDespesaRecorrenteAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = despesaRecorrenteFormSchema.parse(values);
    const service = await createDespesaRecorrenteService(tenant.id);
    await service.update(id, {
      descricao: parsed.descricao,
      fornecedor_id: parsed.fornecedor_id || null,
      fornecedor_nome: parsed.fornecedor_nome || null,
      forma_pagamento_id: parsed.forma_pagamento_id || null,
      categoria_financeira_id: parsed.categoria_financeira_id,
      centro_custo_id: parsed.centro_custo_id,
      plano_conta_id: parsed.plano_conta_id,
      valor: parsed.valor,
      dia_vencimento: parsed.dia_vencimento,
      termina_em: parsed.termina_em || null,
      max_ocorrencias: parsed.max_ocorrencias ?? null,
      observacoes: parsed.observacoes || null,
    });

    revalidateFinanceiroPaths(tenantSlug, "despesas-recorrentes", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao atualizar recorrência.");
  }
}

export async function pauseDespesaRecorrenteAction(
  tenantSlug: string,
  id: string,
  pausada: boolean,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createDespesaRecorrenteService(tenant.id);
    await service.pause(id, pausada);
    revalidateFinanceiroPaths(tenantSlug, "despesas-recorrentes", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao pausar/retomar recorrência.");
  }
}

export async function encerrarDespesaRecorrenteAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createDespesaRecorrenteService(tenant.id);
    await service.update(id, {
      ativo: false,
      pausada: true,
      termina_em: new Date().toISOString().slice(0, 10),
    });
    revalidateFinanceiroPaths(tenantSlug, "despesas-recorrentes", id);
    return { success: true, id };
  } catch (error) {
    return failAction(error, "Erro ao encerrar recorrência.");
  }
}

export async function deleteDespesaRecorrenteAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createDespesaRecorrenteService(tenant.id);
    await service.softDelete(id);
    revalidateFinanceiroPaths(tenantSlug, "despesas-recorrentes");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao excluir recorrência.");
  }
}

export async function generateDespesaRecorrenteAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createDespesaRecorrenteService(tenant.id);
    const result = await service.generateNextOccurrence(id);
    if (!result) {
      return { success: false, error: "Nenhuma ocorrência gerada." };
    }
    revalidateFinanceiroPaths(tenantSlug, "despesas-recorrentes", id);
    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", result.contaId);
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, id: result.contaId };
  } catch (error) {
    return failAction(error, "Erro ao gerar próxima ocorrência.");
  }
}

export async function duplicateDespesaRecorrenteAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createDespesaRecorrenteService(tenant.id);
    const current = await service.getById(id);
    if (!current) throw new Error("Recorrência não encontrada.");
    const item = await service.create({
      descricao: `${current.descricao} (cópia)`,
      fornecedor_id: current.fornecedor_id,
      fornecedor_nome: current.fornecedor_nome,
      forma_pagamento_id: current.forma_pagamento_id,
      categoria_financeira_id: current.categoria_financeira_id!,
      centro_custo_id: current.centro_custo_id!,
      plano_conta_id: current.plano_conta_id!,
      valor: Number(current.valor),
      dia_vencimento: current.dia_vencimento,
      inicia_em: current.inicia_em,
      termina_em: current.termina_em,
      max_ocorrencias: current.max_ocorrencias,
      observacoes: current.observacoes,
      pausada: true,
      ativo: true,
    });
    revalidateFinanceiroPaths(tenantSlug, "despesas-recorrentes", item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return failAction(error, "Erro ao duplicar recorrência.");
  }
}

export async function applyDreGapSuggestionAction(
  tenantSlug: string,
  input: {
    categoriaId?: string | null;
    planoId?: string | null;
    linha: string;
    detalhe: string | null;
    origem: "sugestao_nome" | "lote";
  },
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    if (input.categoriaId) {
      const categorias = await createCategoriaFinanceiraService(tenant.id);
      await categorias.applyClassification({
        id: input.categoriaId,
        linha: input.linha,
        detalhe: input.detalhe,
        origem: input.origem,
      });
    } else if (input.planoId) {
      const planos = await createPlanoContaService(tenant.id);
      await planos.applyClassification({
        id: input.planoId,
        linha: input.linha,
        detalhe: input.detalhe,
        origem: input.origem,
      });
    } else {
      return {
        success: false,
        error: "Sem categoria/plano para aplicar a sugestão.",
      };
    }
    revalidateFinanceiroPaths(tenantSlug, "categorias");
    revalidateFinanceiroPaths(tenantSlug, "plano-contas");
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true };
  } catch (error) {
    return failAction(error, "Erro ao aplicar sugestão de classificação.");
  }
}

export async function applyDreGapSuggestionsBatchAction(
  tenantSlug: string,
  items: Array<{
    categoriaId?: string | null;
    planoId?: string | null;
    linha: string;
    detalhe: string | null;
  }>,
): Promise<ActionResult & { updated?: number }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const categorias = await createCategoriaFinanceiraService(tenant.id);
    const planos = await createPlanoContaService(tenant.id);
    let updated = 0;
    const seenCat = new Set<string>();
    const seenPlano = new Set<string>();

    for (const item of items) {
      if (item.categoriaId && !seenCat.has(item.categoriaId)) {
        seenCat.add(item.categoriaId);
        await categorias.applyClassification({
          id: item.categoriaId,
          linha: item.linha,
          detalhe: item.detalhe,
          origem: "lote",
        });
        updated += 1;
      } else if (
        !item.categoriaId &&
        item.planoId &&
        !seenPlano.has(item.planoId)
      ) {
        seenPlano.add(item.planoId);
        await planos.applyClassification({
          id: item.planoId,
          linha: item.linha,
          detalhe: item.detalhe,
          origem: "lote",
        });
        updated += 1;
      }
    }

    revalidateFinanceiroPaths(tenantSlug, "categorias");
    revalidateFinanceiroPaths(tenantSlug, "plano-contas");
    revalidateFinanceiroPaths(tenantSlug, "dre");
    return { success: true, updated };
  } catch (error) {
    return failAction(error, "Erro ao aplicar lote de classificações.");
  }
}
