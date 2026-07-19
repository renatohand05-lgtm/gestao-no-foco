"use server";

import { revalidatePath } from "next/cache";

import { createClienteService } from "@/lib/clientes/cliente-service";
import { normalizeClienteFormValues } from "@/lib/clientes/mappers";
import { clienteFormSchema } from "@/lib/clientes/validations";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

export async function checkClienteDuplicatesAction(
  tenantSlug: string,
  input: {
    excludeId?: string;
    documento?: string | null;
    email?: string | null;
    telefone?: string | null;
  },
) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createClienteService(tenant.id);
    return { success: true as const, result: await service.checkDuplicates(input) };
  } catch (error) {
    return {
      ...toActionError(error, "Erro ao verificar duplicidades.", "clientes.checkDuplicates"),
      success: false as const,
    };
  }
}

function revalidateClientePaths(tenantSlug: string, clienteId?: string) {
  revalidatePath(`/${tenantSlug}/clientes`);
  revalidatePath(`/${tenantSlug}/busca`);

  if (clienteId) {
    revalidatePath(`/${tenantSlug}/clientes/${clienteId}`);
    revalidatePath(`/${tenantSlug}/clientes/${clienteId}/editar`);
  }
}

export async function createClienteAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = clienteFormSchema.parse(values);
    const service = await createClienteService(tenant.id);
    const cliente = await service.create(normalizeClienteFormValues(parsed));

    revalidateClientePaths(tenantSlug, cliente.id);
    return { success: true, id: cliente.id };
  } catch (error) {
    return toActionError(error, "Erro ao criar cliente.", "clientes.create");
  }
}

export async function updateClienteAction(
  tenantSlug: string,
  clienteId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = clienteFormSchema.parse(values);
    const service = await createClienteService(tenant.id);
    await service.update(clienteId, normalizeClienteFormValues(parsed));

    revalidateClientePaths(tenantSlug, clienteId);
    return { success: true, id: clienteId };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar cliente.", "clientes.update");
  }
}

export async function deleteClienteAction(
  tenantSlug: string,
  clienteId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createClienteService(tenant.id);
    await service.softDelete(clienteId);

    revalidateClientePaths(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao excluir cliente.", "clientes.delete");
  }
}
