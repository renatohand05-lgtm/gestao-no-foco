"use server";

import { revalidatePath } from "next/cache";

import {
  createFinanceiroBeneficiarioService,
  type BeneficiarioOption,
  type FinanceiroBeneficiarioInput,
} from "@/lib/financeiro/beneficiario-service";
import { isBeneficiarioCadastroTipo } from "@/lib/financeiro/beneficiario-types";
import { requireFinanceiroAction } from "@/lib/financeiro/action-auth";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";

type ActionResult =
  | { success: true; item: BeneficiarioOption }
  | { success: false; error: string; item?: undefined };

export async function createFinanceiroBeneficiarioAction(
  tenantSlug: string,
  input: FinanceiroBeneficiarioInput,
): Promise<ActionResult> {
  try {
    const tenant = await requireFinanceiroAction(tenantSlug, "financeiro.criar");
    if (!isBeneficiarioCadastroTipo(input.tipo)) {
      return { success: false, error: "Tipo de beneficiário inválido." };
    }
    const service = await createFinanceiroBeneficiarioService(tenant.id);
    const item = await service.create(input);
    revalidatePath(`/${tenantSlug}/financeiro/contas-pagar`);
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: mapDatabaseErrorToUserMessage(
        error,
        "Erro ao cadastrar beneficiário.",
      ),
    };
  }
}
