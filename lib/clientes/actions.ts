"use server";

import { revalidatePath } from "next/cache";

import { createClienteService } from "@/lib/clientes/cliente-service";
import { normalizeClienteFormValues } from "@/lib/clientes/mappers";
import { clienteFormSchema } from "@/lib/clientes/validations";
import { requireTenant } from "@/lib/tenants";

type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

function revalidateClientePaths(tenantSlug: string, clienteId?: string) {
  revalidatePath(`/${tenantSlug}/clientes`);

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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar cliente.",
    };
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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar cliente.",
    };
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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir cliente.",
    };
  }
}
