import { notFound } from "next/navigation";

import { ClienteDetail } from "@/components/clientes/cliente-detail";
import { ClienteFeedback } from "@/components/clientes/cliente-feedback";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { requireTenant } from "@/lib/tenants";
import type { ClienteSuccessMessage } from "@/types/clientes";

export const metadata = { title: "Detalhes do cliente" };

export default async function ClienteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const { success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createClienteService(tenant.id);
  const cliente = await service.getById(id);

  if (!cliente) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ClienteFeedback
        success={success as ClienteSuccessMessage | undefined}
        error={error}
      />
      <ClienteDetail tenantSlug={tenantSlug} cliente={cliente} />
    </div>
  );
}
