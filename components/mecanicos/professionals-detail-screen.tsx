import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MecanicoDetailPanel } from "@/components/mecanicos/mecanico-detail-panel";
import { createMecanicoCompetenciaService } from "@/lib/mecanicos/competencia-service";
import { createMecanicoCustoService } from "@/lib/mecanicos/custo-service";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { tryResolvePermissions } from "@/lib/permissoes/authorization";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSegmentUiCopy, professionalsHref } from "@/lib/segments/copy.ts";

type Props = {
  tenantSlug: string;
  id: string;
  routePath: "/oficina/mecanicos" | "/profissionais";
};

export async function ProfessionalsDetailScreen({
  tenantSlug,
  id,
  routePath,
}: Props) {
  const tenant = await requireTenant(tenantSlug);
  const copy = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });

  if (
    routePath === "/oficina/mecanicos" &&
    copy.professionalsListPath === "/profissionais"
  ) {
    redirect(`/${tenantSlug}/profissionais/${id}`);
  }
  if (
    routePath === "/profissionais" &&
    copy.professionalsListPath === "/oficina/mecanicos"
  ) {
    redirect(`/${tenantSlug}/oficina/mecanicos/${id}`);
  }

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
  const mecPerms = await tryResolvePermissions(tenant.id, tenant.role, [
    "mecanicos.visualizar",
    "mecanicos.editar",
    "mecanicos.ver_custo",
    "mecanicos.editar_custo",
    "financeiro.gerar_obrigacao_mecanico",
  ]);
  canView = mecPerms["mecanicos.visualizar"];
  canEdit = mecPerms["mecanicos.editar"];
  canVerCusto = mecPerms["mecanicos.ver_custo"];
  canEditarCusto = mecPerms["mecanicos.editar_custo"];
  canGerarFolha = mecPerms["financeiro.gerar_obrigacao_mecanico"];

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

  const listHref = professionalsHref(tenantSlug, copy);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: copy.professionals, href: listHref },
          { label: mecanico.nome_completo },
        ]}
      />
      <ExecutiveHeader
        title={mecanico.nome_completo}
        description={`${mecanico.especialidade} · ${mecanico.status}`}
        actions={
          <>
            <Link href={listHref} className="text-sm underline">
              Voltar
            </Link>
          </>
        }
      />

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
        automotiveSpecialties={copy.automotiveSpecialties}
        professionalSpecialtySuggestions={copy.professionalSpecialtySuggestions}
      />
    </ExecutivePage>
  );
}
