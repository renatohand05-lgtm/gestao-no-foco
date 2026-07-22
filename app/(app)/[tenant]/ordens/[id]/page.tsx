import { notFound } from "next/navigation";

import { OsWorkspace } from "@/components/ordens/os-workspace";
import { ModuleHeader } from "@/components/layout/module-header";
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
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Detalhe da OS" };

export default async function OsDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
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
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canApplyDesconto = await perms.has("desconto.aplicar");
    canAddPersonalizado = await perms.has("os.adicionar_item_personalizado");
    canConvertPersonalizado = await perms.has(
      "os.converter_item_personalizado",
    );
    canCancel = await perms.has("os.cancelar");
    canArquivar = await perms.has("os.arquivar");
    canExcluirRascunho = await perms.has("os.excluir_rascunho");
    canRestaurar = await perms.has("os.restaurar");
    canBindRecurso = await perms.has("centro_operacoes.alterar_status");
    canAtribuirMecanico = await perms.has("os.atribuir_mecanico");
    canTransferirMecanico = await perms.has("os.transferir_mecanico");
    canApontarHoras = await perms.has("mecanicos.apontar_horas");
  } catch {
    /* ok */
  }

  let recursos: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createRecursosOcupacaoService>>["getData"]
    >
  >["recursos"] = [];
  try {
    const recService = await createRecursosOcupacaoService(tenant.id);
    const recData = await recService.getData();
    recursos = recData.recursos;
  } catch {
    /* migration pendente */
  }

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
  try {
    const mecSvc = await createMecanicoService(tenant.id);
    const osMecSvc = await createOsMecanicoService(tenant.id);
    mecanicosCadastro = await mecSvc.list({ status: "ativo" });
    osMecanicos = await osMecSvc.listByOs(id);
    osCustoReal = await osMecSvc.calcularCustoReal(id);
  } catch {
    /* migration pendente */
  }

  let recorrencia = null;
  try {
    recorrencia = await createClienteRecorrenciaService(tenant.id).then((s) =>
      s.get(os.cliente_id),
    );
  } catch {
    /* ok */
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={`OS #${os.numero}`}
        description={`${os.cliente_nome ?? "Cliente"} · ${os.placa ?? "sem placa"}`}
        breadcrumbs={[
          { label: "Ordens", href: `/${tenantSlug}/ordens` },
          { label: `#${os.numero}` },
        ]}
      />
      <OsWorkspace
        tenantSlug={tenantSlug}
        os={os}
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
    </div>
  );
}
