import { notFound } from "next/navigation";

import { OsWorkspaceLazy } from "@/components/ordens/os-workspace-lazy";
import { createClienteRecorrenciaService } from "@/lib/crm/cliente-recorrencia-service";
import { createCompartilhamentoService } from "@/lib/ordens/compartilhamento-service";
import { createInspecaoStorageService } from "@/lib/ordens/inspecao-storage-service";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { createOrcamentoVersaoService } from "@/lib/ordens/orcamento-versao-service";
import { createVeiculoService } from "@/lib/ordens/veiculo-service";
import { createRecursosOcupacaoService } from "@/lib/operacoes/recursos-service";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { createOsMecanicoService } from "@/lib/mecanicos/os-mecanico-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { tryResolvePermissions } from "@/lib/permissoes/authorization";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSegmentUiCopy, segmentCopyForClient } from "@/lib/segments/copy.ts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ui = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  return { title: ui.workOrder };
}

export default async function OsDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ui = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const service = await createOrdemServicoService(tenant.id);
  const os = await service.getById(id);
  if (!os) notFound();

  const supabase = await createClient();
  const veiculoService = await createVeiculoService(tenant.id);
  const inspecaoStorage = await createInspecaoStorageService(tenant.id);
  const orcamentoService = await createOrcamentoVersaoService(tenant.id);
  const compartilhamentoService = await createCompartilhamentoService(tenant.id);

  const [
    { data: produtos },
    { data: formas },
    veiculosIniciais,
    anexos,
    orcamentoVersoes,
    compartilhamentos,
  ] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome")
      .limit(500),
    supabase
      .from("formas_pagamento")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome"),
    veiculoService.listOptionsByCliente(os.cliente_id),
    inspecaoStorage.listAnexos(id),
    orcamentoService.listVersions(id),
    compartilhamentoService.listShares(id),
  ]);

  let canApplyDesconto =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["desconto.aplicar"];
  let canAddPersonalizado =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.adicionar_item_personalizado"];
  let canConvertPersonalizado =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.converter_item_personalizado"];
  let canCancel = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.cancelar"];
  let canArquivar = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.arquivar"];
  let canExcluirRascunho =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.excluir_rascunho"];
  let canRestaurar = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.restaurar"];
  let canBindRecurso =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.alterar_status"];
  let canAtribuirMecanico =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.atribuir_mecanico"] ?? false;
  let canTransferirMecanico =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.transferir_mecanico"] ?? false;
  let canApontarHoras =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.apontar_horas"] ?? false;

  const osPermKeys = [
    "desconto.aplicar",
    "os.adicionar_item_personalizado",
    "os.converter_item_personalizado",
    "os.cancelar",
    "os.arquivar",
    "os.excluir_rascunho",
    "os.restaurar",
    "centro_operacoes.alterar_status",
    "os.atribuir_mecanico",
    "os.transferir_mecanico",
    "mecanicos.apontar_horas",
  ] as const;
  const osPerms = await tryResolvePermissions(
    tenant.id,
    tenant.role,
    osPermKeys,
  );
  canApplyDesconto = osPerms["desconto.aplicar"];
  canAddPersonalizado = osPerms["os.adicionar_item_personalizado"];
  canConvertPersonalizado = osPerms["os.converter_item_personalizado"];
  canCancel = osPerms["os.cancelar"];
  canArquivar = osPerms["os.arquivar"];
  canExcluirRascunho = osPerms["os.excluir_rascunho"];
  canRestaurar = osPerms["os.restaurar"];
  canBindRecurso = osPerms["centro_operacoes.alterar_status"];
  canAtribuirMecanico = osPerms["os.atribuir_mecanico"];
  canTransferirMecanico = osPerms["os.transferir_mecanico"];
  canApontarHoras = osPerms["mecanicos.apontar_horas"];

  let recursos: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createRecursosOcupacaoService>>["getData"]
    >
  >["recursos"] = [];
  let mecanicosCadastro: Awaited<
    ReturnType<Awaited<ReturnType<typeof createMecanicoService>>["list"]>
  > = [];
  let osMecanicos: Awaited<
    ReturnType<Awaited<ReturnType<typeof createOsMecanicoService>>["listByOs"]>
  > = [];
  let osCustoReal: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createOsMecanicoService>>["calcularCustoReal"]
    >
  > | null = null;
  let recorrencia = null;

  const [recursosResult, mecanicosResult, recorrenciaResult] =
    await Promise.all([
      (async () => {
        try {
          const recService = await createRecursosOcupacaoService(tenant.id);
          const recData = await recService.getData();
          return recData.recursos;
        } catch {
          return null;
        }
      })(),
      (async () => {
        try {
          const mecSvc = await createMecanicoService(tenant.id);
          const osMecSvc = await createOsMecanicoService(tenant.id);
          const [cadastro, porOs, custo] = await Promise.all([
            mecSvc.list({ status: "ativo" }),
            osMecSvc.listByOs(id),
            osMecSvc.calcularCustoReal(id),
          ]);
          return { cadastro, porOs, custo };
        } catch {
          return null;
        }
      })(),
      (async () => {
        try {
          const s = await createClienteRecorrenciaService(tenant.id);
          return await s.get(os.cliente_id);
        } catch {
          return null;
        }
      })(),
    ]);

  if (recursosResult) recursos = recursosResult;
  if (mecanicosResult) {
    mecanicosCadastro = mecanicosResult.cadastro;
    osMecanicos = mecanicosResult.porOs;
    osCustoReal = mecanicosResult.custo;
  }
  if (recorrenciaResult) recorrencia = recorrenciaResult;

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: ui.workOrders, href: `/${tenantSlug}/ordens` },
          { label: `#${os.numero}` },
        ]} />
      <ExecutiveHeader title={ui.workOrderDetailTitle(os.numero)} description={
          ui.showVehicles
            ? `${os.cliente_nome ?? ui.customer} · ${os.placa ?? ui.missingVehicleLabel}`
            : (os.cliente_nome ?? ui.customer)
        } />
      <OsWorkspaceLazy
        tenantSlug={tenantSlug}
        os={os}
        professionalLabel={ui.professional}
        professionalsLabel={ui.professionals}
        uiCopy={segmentCopyForClient(ui)}
        produtos={(produtos ?? []).map((p) => ({ id: p.id, nome: p.nome }))}
        formasPagamento={(formas ?? []).map((f) => ({
          id: f.id,
          nome: f.nome,
        }))}
        veiculosIniciais={veiculosIniciais}
        anexos={anexos}
        orcamentoVersoes={orcamentoVersoes}
        compartilhamentos={compartilhamentos}
        emailConfigured={compartilhamentoService.emailConfigured()}
        recorrencia={recorrencia}
        canApplyDesconto={canApplyDesconto}
        canAddPersonalizado={canAddPersonalizado}
        canConvertPersonalizado={canConvertPersonalizado}
        canCancel={canCancel}
        canArquivar={canArquivar}
        canExcluirRascunho={canExcluirRascunho}
        canRestaurar={canRestaurar}
        recursos={recursos}
        canBindRecurso={canBindRecurso}
        mecanicosCadastro={mecanicosCadastro}
        osMecanicos={osMecanicos}
        osCustoReal={osCustoReal}
        canAtribuirMecanico={canAtribuirMecanico}
        canTransferirMecanico={canTransferirMecanico}
        canApontarHoras={canApontarHoras}
      />
    </ExecutivePage>
  );
}
