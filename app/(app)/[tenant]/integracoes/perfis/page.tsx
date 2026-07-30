import Link from "next/link";

import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { IntelligenceLearningPanel } from "@/components/import-engine/intelligence-learning-panel";
import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listImportProfiles,
  listLearningRules,
} from "@/lib/import-engine/intelligence/intelligence-actions";
import { listImportAdapters } from "@/lib/import-engine";
import { FINANCE_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/finance";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Perfis e Aprendizados" };

export default async function PerfisAprendizadosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const adapters = listImportAdapters();
  const moduleKey = FINANCE_IMPORT_ADAPTER.moduleKey;
  const [profilesR, rulesR] = await Promise.all([
    listImportProfiles(tenantSlug, moduleKey),
    listLearningRules(tenantSlug, moduleKey),
  ]);
  const profiles = profilesR.success ? profilesR.profiles : [];
  const rules = rulesR.success ? rulesR.rules : [];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Perfis e Aprendizados" },
        ]}
      />
      <ExecutiveHeader
        title="Perfis e Aprendizados"
        description="Perfis de mapeamento reutilizáveis e painel de aprendizado acumulado por tenant (sem IA generativa)."
      />

      <ExecutiveSection
        title="Perfis de importação"
        description={`Módulo ${moduleKey} · ${profiles.length} perfil(is). Edite no Mapping Studio.`}
        panel
        actions={
          <Button
            size="sm"
            render={<Link href={`/${tenantSlug}/integracoes/mapeamentos`} />}
          >
            Abrir Mapping Studio
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum perfil ainda. Crie no Mapping Studio (ex.: ERP Oficina,
              Planilha Financeira).
            </p>
          ) : (
            profiles.map((p) => (
              <Card
                key={p.id}
                className="border-border/60 transition-shadow motion-safe:hover:shadow-md"
              >
                <CardHeader>
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  <CardDescription>
                    {p.description || p.targetEntity} · {p.importCount ?? 0} usos
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1">
                  {p.isDefault ? (
                    <ExecutiveBadge tone="success">Padrão</ExecutiveBadge>
                  ) : null}
                  {p.format ? (
                    <ExecutiveBadge tone="neutral" variant="outline">
                      {p.format}
                    </ExecutiveBadge>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ExecutiveSection>

      <IntelligenceLearningPanel rules={rules} />

      <p className="text-xs text-muted-foreground">
        Adaptadores registados: {adapters.map((a) => a.label).join(" · ")}
      </p>
    </ExecutivePage>
  );
}
