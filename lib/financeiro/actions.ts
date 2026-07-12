"use server";

import { revalidatePath } from "next/cache";

import { createCategoriaFinanceiraService } from "@/lib/financeiro/categoria-financeira-service";
import { createCentroCustoService } from "@/lib/financeiro/centro-custo-service";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { createFormaPagamentoService } from "@/lib/financeiro/forma-pagamento-service";
import { getCurrentProfile } from "@/lib/auth/session";
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
  estornarMovimentacaoBancariaFormSchema,
  formaPagamentoFormSchema,
  movimentacaoBancariaFormSchema,
  pagarContaFormSchema,
  planoContaFormSchema,
  receberContaFormSchema,
  transferenciaBancariaFormSchema,
} from "@/lib/financeiro/validations";
import { requireTenant } from "@/lib/tenants";

type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

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
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao cadastrar conta.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar conta.",
    };
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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir conta.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar centro de custo.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar centro de custo.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir centro de custo.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar conta bancária.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar conta bancária.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir conta bancária.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar forma de pagamento.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar forma de pagamento.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir forma de pagamento.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar categoria.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar categoria.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao excluir categoria.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar conta a receber.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar conta a receber.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao corrigir classificação da conta a receber.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao registrar baixa de recebimento.",
    };
  }
}

export async function cancelarContaReceberAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createContaReceberService(tenant.id);
    await service.cancelar(id);

    revalidateFinanceiroPaths(tenantSlug, "contas-receber", id);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cancelar conta a receber.",
    };
  }
}

export async function deleteContaReceberAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createContaReceberService(tenant.id);
    await service.softDelete(id);

    revalidateFinanceiroPaths(tenantSlug, "contas-receber");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir conta a receber.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar conta a pagar.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar conta a pagar.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao corrigir classificação da conta a pagar.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao registrar baixa de pagamento.",
    };
  }
}

export async function cancelarContaPagarAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createContaPagarService(tenant.id);
    await service.cancelar(id);

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar", id);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cancelar conta a pagar.",
    };
  }
}

export async function deleteContaPagarAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createContaPagarService(tenant.id);
    await service.softDelete(id);

    revalidateFinanceiroPaths(tenantSlug, "contas-pagar");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir conta a pagar.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao registrar movimentação bancária.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao registrar transferência bancária.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao estornar movimentação bancária.",
    };
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
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir movimentação bancária.",
    };
  }
}
