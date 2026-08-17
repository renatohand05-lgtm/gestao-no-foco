import { notFound } from "next/navigation";

import { ClienteFeedback } from "@/components/clientes/cliente-feedback";
import { ClienteWorkspace } from "@/components/clientes/cliente-workspace";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { createCliente360Service } from "@/lib/crm/cliente-360-service";
import { createCrmExecutivoService } from "@/lib/crm/crm-executivo-service";
import { listTenantMembersForSelect } from "@/lib/crm/tenant-team-service";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { createCustomerReturnService } from "@/lib/retention/return-service";
import { createNotificationOutboxService } from "@/lib/retention/outbox-service";
import { client360Surface } from "@/lib/segments/client-360.ts";
import { defaultReturnRuleForSegment } from "@/lib/retention/returns";
import { tenantHasMutationPermission } from "@/lib/rbac/mutation-auth";
import { createCommunicationPreferenceService } from "@/lib/retention/prefs-service";
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

  const [data360, consultores, execService, retSvc, outboxSvc] = await Promise.all([
    createCliente360Service(tenant.id).then((s) => s.load(id)),
    listTenantMembersForSelect(tenant.id),
    createCrmExecutivoService(tenant.id),
    createCustomerReturnService(tenant.id),
    createNotificationOutboxService(tenant.id),
  ]);
  const prefsSvc = await createCommunicationPreferenceService(tenant.id);

  const [perfilExecutivo, retornos] = await Promise.all([
    execService.loadPerfilFrom360(
      {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        whatsapp: cliente.whatsapp,
        ativo: cliente.ativo,
        created_at: cliente.created_at,
      },
      data360,
    ),
    retSvc.listByCliente(id),
  ]);
  const comunicacoes = await outboxSvc.listByCliente(id);
  const prefs = await prefsSvc.get(id);
  const canSeeCommDetails = await tenantHasMutationPermission(
    tenantSlug,
    "crm.notificacoes.enviar",
  );
  const retornoMensagens = (
    await Promise.all(
      retornos.map((r) => outboxSvc.listByEntity("retorno", r.id)),
    )
  ).flat();

  const consultorNome =
    consultores.find((c) => c.id === cliente.consultor_id)?.nome ?? null;

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes" />
      <ClienteFeedback
        success={success as ClienteSuccessMessage | undefined}
        error={error}
      />
      <ClienteWorkspace
        tenantSlug={tenantSlug}
        cliente={cliente}
        data360={data360}
        consultorNome={consultorNome}
        perfilExecutivo={perfilExecutivo}
        retornos={retornos}
        retornoMensagens={retornoMensagens}
        comunicacoes={comunicacoes}
        communicationPrefs={prefs}
        canSeeCommDetails={canSeeCommDetails}
        client360={client360Surface({
          segment: tenant.segment,
          segmentVersion: tenant.segment_version,
          segmentConfig: tenant.segment_config,
        })}
        hideProcedure={
          defaultReturnRuleForSegment(tenant.segment).hideProcedure
        }
      />
    </div>
  );
}
