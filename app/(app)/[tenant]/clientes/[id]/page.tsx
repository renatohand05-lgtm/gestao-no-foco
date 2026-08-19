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
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { serviceSuggestionsForContext } from "@/lib/segments/catalogs/suggest.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
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

  const client360 = client360Surface({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const [servicosRes, profsRes, canCreateProduto] = client360.showVehicles
    ? await Promise.all([
        createProdutoService(tenant.id).then((s) =>
          s.list({ tipo: "servico", perPage: 100, ativo: true }),
        ),
        createMecanicoService(tenant.id).then((s) => s.listDisponiveis()),
        tenantHasMutationPermission(tenantSlug, "produtos.criar"),
      ])
    : [null, null, false];

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
        client360={client360}
        hideProcedure={
          defaultReturnRuleForSegment(tenant.segment).hideProcedure
        }
        agendaCreate={
          client360.showVehicles
            ? {
                servicos: (servicosRes?.data ?? []).map((s) => ({
                  id: s.id,
                  label: s.nome,
                  minutes: s.tempo_estimado_minutos ?? null,
                })),
                profissionais: (profsRes ?? []).map((p) => ({
                  id: p.id,
                  label: p.nome_completo,
                })),
                library: serviceSuggestionsForContext(ctx, { includeCombos: false }),
                canCreateProduto,
                initialVeiculos: data360.veiculos.map((v) => ({
                  id: v.id,
                  placa: v.placa,
                  marca: v.marca,
                  modelo: v.modelo,
                  ano: v.ano,
                  cor: null,
                })),
              }
            : undefined
        }
      />
    </div>
  );
}
