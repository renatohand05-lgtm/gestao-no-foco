"use server";

import { revalidatePath } from "next/cache";

import { createServiceBulkService } from "@/lib/produtos/service-bulk-service";
import { requireTenant } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return user.id;
}

export async function limparBaseServicosAction(input: {
  tenantSlug: string;
  confirmation: string;
}) {
  const tenant = await requireTenant(input.tenantSlug);
  const userId = await requireUserId();
  const service = await createServiceBulkService(tenant.id);
  const result = await service.limparBaseServicos({
    confirmation: input.confirmation,
    userId,
  });
  revalidatePath(`/${input.tenantSlug}/produtos`);
  revalidatePath(`/${input.tenantSlug}/produtos/gerenciar-servicos`);
  revalidatePath(`/${input.tenantSlug}/produtos/qualidade-servicos`);
  return result;
}

export async function softDeleteSelectedServicesAction(input: {
  tenantSlug: string;
  ids: string[];
}) {
  const tenant = await requireTenant(input.tenantSlug);
  const service = await createServiceBulkService(tenant.id);
  const count = await service.softDeleteServices(input.ids);
  revalidatePath(`/${input.tenantSlug}/produtos`);
  revalidatePath(`/${input.tenantSlug}/produtos/gerenciar-servicos`);
  return { count };
}

export async function deactivateSelectedServicesAction(input: {
  tenantSlug: string;
  ids: string[];
}) {
  const tenant = await requireTenant(input.tenantSlug);
  const service = await createServiceBulkService(tenant.id);
  const count = await service.deactivateServices(input.ids);
  revalidatePath(`/${input.tenantSlug}/produtos`);
  revalidatePath(`/${input.tenantSlug}/produtos/gerenciar-servicos`);
  return { count };
}
