import Link from "next/link";
import { notFound } from "next/navigation";

import { MecanicoDetailPanel } from "@/components/mecanicos/mecanico-detail-panel";
import { ModuleHeader } from "@/components/layout/module-header";
import { createMecanicoCompetenciaService } from "@/lib/mecanicos/competencia-service";
import { createMecanicoCustoService } from "@/lib/mecanicos/custo-service";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Detalhe do mecânico" };

export default async function MecanicoDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.visualizar"] ?? true;
  let canEdit =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.editar"] ?? false;
  let canVerCusto =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.ver_custo"] ?? false;
  let canEditarCusto =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.editar_custo"] ?? false;
  let canGerarFolha =
    DEFAULT_ROLE_PERMISSIONS[tenant.role][
      "financeiro.gerar_obrigacao_mecanico"
    ] ?? false;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("mecanicos.visualizar");
    canEdit = await perms.has("mecanicos.editar");
    canVerCusto = await perms.has("mecanicos.ver_custo");
    canEditarCusto = await perms.has("mecanicos.editar_custo");
    canGerarFolha = await perms.has("financeiro.gerar_obrigacao_mecanico");
  } catch {
    /* ok */
  }

  if (!canView) {
    return <p className="text-sm text-muted-foreground">Sem permissão.</p>;
  }

  const service = await createMecanicoService(tenant.id);
  const mecanico = await service.getById(id);
  if (!mecanico) notFound();

  const custoSvc = await createMecanicoCustoService(tenant.id);
  const compSvc = await createMecanicoCompetenciaService(tenant.id);
  const [custos, competencias, auditoria] = await Promise.all([
    canVerCusto ? custoSvc.listByMecanico(id) : Promise.resolve([]),
    canVerCusto ? compSvc.listByMecanico(id) : Promise.resolve([]),
    service.listAuditoria(id),
  ]);

  const supabase = await createClient();
  const [{ data: centros }, { data: categorias }, { data: planos }] =
    await Promise.all([
      supabase
        .from("centros_custo")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome")
        .limit(200),
      supabase
        .from("categorias_financeiras")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome")
        .limit(200),
      supabase
        .from("plano_contas")
        .select("id, nome, codigo")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome")
        .limit(200),
    ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={mecanico.nome_completo}
        description={`${mecanico.especialidade} · ${mecanico.status}`}
        breadcrumbs={[
          { label: "Mecânicos", href: `/${tenantSlug}/oficina/mecanicos` },
          { label: mecanico.nome_completo },
        ]}
      >
        <Link
          href={`/${tenantSlug}/oficina/mecanicos`}
          className="text-sm underline"
        >
          Voltar
        </Link>
      </ModuleHeader>

      <MecanicoDetailPanel
        tenantSlug={tenantSlug}
        mecanico={mecanico}
        custos={custos}
        competencias={competencias}
        auditoria={auditoria}
        canEdit={canEdit}
        canVerCusto={canVerCusto}
        canEditarCusto={canEditarCusto}
        canGerarFolha={canGerarFolha}
        centros={(centros ?? []) as { id: string; nome: string }[]}
        categorias={(categorias ?? []) as { id: string; nome: string }[]}
        planos={
          (planos ?? []) as {
            id: string;
            nome: string;
            codigo?: string | null;
          }[]
        }
      />
    </div>
  );
}
