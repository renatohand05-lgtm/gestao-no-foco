import Link from "next/link";
import { redirect } from "next/navigation";

import { MecanicosManager } from "@/components/mecanicos/mecanicos-manager";
import { SectionCard } from "@/components/ui/section-card";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { tryResolvePermissions } from "@/lib/permissoes/authorization";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";

type Props = {
  tenantSlug: string;
  routePath: "/oficina/mecanicos" | "/profissionais";
};

export async function ProfessionalsListScreen({ tenantSlug, routePath }: Props) {
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
    redirect(`/${tenantSlug}/profissionais`);
  }
  if (
    routePath === "/profissionais" &&
    copy.professionalsListPath === "/oficina/mecanicos"
  ) {
    redirect(`/${tenantSlug}/oficina/mecanicos`);
  }

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.visualizar"] ?? true;
  let canCreate =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.criar"] ?? false;
  let canEdit =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.editar"] ?? false;
  const mecListPerms = await tryResolvePermissions(tenant.id, tenant.role, [
    "mecanicos.visualizar",
    "mecanicos.criar",
    "mecanicos.editar",
  ]);
  canView = mecListPerms["mecanicos.visualizar"];
  canCreate = mecListPerms["mecanicos.criar"];
  canEdit = mecListPerms["mecanicos.editar"];

  if (!canView) {
    return <p className="text-sm text-muted-foreground">Sem permissão.</p>;
  }

  const service = await createMecanicoService(tenant.id);
  let mecanicos: Awaited<ReturnType<typeof service.list>> = [];
  let migrationPending = false;
  try {
    mecanicos = await service.list({ incluirArquivados: true });
  } catch (e) {
    migrationPending =
      e instanceof Error &&
      /relation.*does not exist|Could not find/i.test(e.message);
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: copy.professionalsParentLabel },
          { label: copy.professionals },
        ]}
      />
      <ExecutiveHeader
        title={copy.professionals}
        description={copy.professionalsDescription}
        actions={
          copy.professionalsListPath === "/oficina/mecanicos" ? (
            <Link
              href={`/${tenantSlug}/ordens/mecanicos`}
              className="text-sm underline"
            >
              Dashboard de produtividade
            </Link>
          ) : null
        }
      />

      {migrationPending ? (
        <SectionCard title="Migration pendente">
          <p className="text-sm text-muted-foreground">
            Aplique{" "}
            <code className="text-xs">
              20260803_mecanicos_custo_os_dre.sql
            </code>{" "}
            no Supabase SQL Editor.
          </p>
        </SectionCard>
      ) : (
        <MecanicosManager
          tenantSlug={tenantSlug}
          listPath={copy.professionalsListPath}
          mecanicos={mecanicos}
          canCreate={canCreate}
          canEdit={canEdit}
          copy={{
            professional: copy.professional,
            professionals: copy.professionals,
            newProfessional: copy.newProfessional,
            automotiveSpecialties: copy.automotiveSpecialties,
            professionalSpecialtySuggestions:
              copy.professionalSpecialtySuggestions,
          }}
        />
      )}
    </ExecutivePage>
  );
}
