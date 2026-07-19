import { notFound } from "next/navigation";

import { OsWorkspace } from "@/components/ordens/os-workspace";
import { ModuleHeader } from "@/components/layout/module-header";
import { createCompartilhamentoService } from "@/lib/ordens/compartilhamento-service";
import { createInspecaoStorageService } from "@/lib/ordens/inspecao-storage-service";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { createOrcamentoVersaoService } from "@/lib/ordens/orcamento-versao-service";
import { createVeiculoService } from "@/lib/ordens/veiculo-service";
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
      />
    </div>
  );
}
