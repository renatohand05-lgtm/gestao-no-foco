import Link from "next/link";
import {
  Braces,
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  Globe,
  Table as TableIcon,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { DataQualityPanel } from "@/components/import-engine/data-quality-panel";
import {
  IntelligenceDrilldown,
  type IntelligenceDrillNode,
} from "@/components/import-engine/intelligence-drilldown";
import { IntelligenceHealthCard } from "@/components/import-engine/intelligence-health-card";
import { IntelligenceHubNav } from "@/components/import-engine/intelligence-hub-nav";
import { IntelligenceJourney } from "@/components/import-engine/intelligence-journey";
import { IntelligenceKpiPanel } from "@/components/import-engine/intelligence-kpi-panel";
import {
  buildDataQualitySummary,
  buildHealthScore,
  buildIntelligenceKpis,
  buildRunTimeline,
} from "@/components/import-engine/intelligence-presentation";
import { IntelligenceTimelinePanel } from "@/components/import-engine/intelligence-timeline-panel";
import { PremiumPreviewTabs } from "@/components/import-engine/premium-preview-tabs";
import { Badge } from "@/components/ui/badge";
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
  listImportRuns,
  listImportProfiles,
  listLearningRules,
} from "@/lib/import-engine/intelligence/intelligence-actions";
import { FINANCE_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/finance";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Centro de Inteligência de Dados" };

type FormatCard = {
  label: string;
  icon: LucideIcon;
  href?: string;
  comingSoon?: boolean;
  note?: string;
};

export default async function IntegracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const moduleKey = FINANCE_IMPORT_ADAPTER.moduleKey;
  const [runsR, profilesR, rulesR] = await Promise.all([
    listImportRuns(tenantSlug, { limit: 50, offset: 0 }),
    listImportProfiles(tenantSlug, moduleKey),
    listLearningRules(tenantSlug, moduleKey),
  ]);

  const runs = runsR.success ? runsR.items : [];
  const totalRuns = runsR.success ? runsR.total : 0;
  const failedOrPartial = runs.filter(
    (r) => r.status === "failed" || r.status === "partial",
  ).length;
  const profileCount = profilesR.success ? profilesR.profiles.length : 0;
  const learningCount = rulesR.success ? rulesR.rules.length : 0;

  const kpis = buildIntelligenceKpis(runs, totalRuns);
  const health = buildHealthScore(runs);
  const quality = buildDataQualitySummary(runs, totalRuns);
  const latestRun = runs[0] ?? null;
  const timeline = buildRunTimeline(latestRun);

  const journeyCompleted =
    latestRun != null
      ? ([
          "enviar",
          "detectar",
          latestRun.mappingSnapshot ? "mapear" : undefined,
          "classificar",
          latestRun.status === "preview" ? undefined : "confirmar",
          "acompanhar",
        ].filter(Boolean) as Array<
          "enviar" | "detectar" | "mapear" | "classificar" | "confirmar" | "acompanhar"
        >)
      : [];

  const journeyCurrent =
    latestRun == null
      ? null
      : latestRun.status === "preview"
        ? ("revisar" as const)
        : latestRun.status === "completed"
          ? ("acompanhar" as const)
          : ("confirmar" as const);

  const drillNodes: IntelligenceDrillNode[] = latestRun
    ? [
        {
          level: "indicator",
          id: "quality",
          label: "Qualidade",
          href: `/${tenantSlug}/integracoes/qualidade`,
        },
        {
          level: "import",
          id: latestRun.id,
          label: latestRun.fileName,
          meta: latestRun.status,
        },
      ]
    : [];

  const importFormats: FormatCard[] = [
    {
      label: "Excel (.xlsx / .xls)",
      icon: FileSpreadsheet,
      href: `/${tenantSlug}/integracoes/importar`,
    },
    {
      label: "CSV",
      icon: TableIcon,
      href: `/${tenantSlug}/integracoes/importar`,
    },
    {
      label: "PDF (texto pesquisável)",
      icon: FileText,
      href: `/${tenantSlug}/integracoes/importar`,
    },
    {
      label: "OFX (extrato bancário)",
      icon: FileText,
      href: `/${tenantSlug}/integracoes/importar`,
    },
    { label: "CNAB (remessa/retorno)", icon: FileText, comingSoon: true },
    {
      label: "XML",
      icon: FileText,
      href: `/${tenantSlug}/integracoes/importar`,
    },
  ];

  const apiFormats: FormatCard[] = [
    {
      label: "Webhook",
      icon: Webhook,
      href: `/${tenantSlug}/integracoes/conectores`,
      comingSoon: true,
    },
    {
      label: "API REST",
      icon: Globe,
      href: `/${tenantSlug}/integracoes/conectores`,
      comingSoon: true,
    },
  ];

  const pasteFormats: FormatCard[] = [
    {
      label: "Tabela",
      icon: TableIcon,
      href: `/${tenantSlug}/integracoes/importar`,
      note: "Parser clipboard disponível",
    },
    {
      label: "CSV",
      icon: TableIcon,
      href: `/${tenantSlug}/integracoes/importar`,
      note: "Parser clipboard disponível",
    },
    {
      label: "JSON",
      icon: Braces,
      href: `/${tenantSlug}/integracoes/importar`,
      note: "Parser clipboard disponível",
    },
    {
      label: "Texto estruturado",
      icon: ClipboardPaste,
      href: `/${tenantSlug}/integracoes/importar`,
      note: "Parser clipboard disponível",
    },
  ];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[{ label: "Integrações" }]} />
      <ExecutiveHeader
        title="Centro de Inteligência de Dados"
        description="Painel executivo de importações, mapeamentos, aprendizado, histórico e rollback — apresentação Enterprise sobre a Import Engine existente."
      />

      <IntelligenceHubNav tenantSlug={tenantSlug} />

      <IntelligenceJourney
        currentStep={journeyCurrent}
        completedSteps={journeyCompleted}
      />

      <IntelligenceKpiPanel kpis={kpis} />

      {latestRun ? (
        <IntelligenceDrilldown
          path={{ tenantSlug, nodes: drillNodes }}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <IntelligenceHealthCard health={health} />
        <IntelligenceTimelinePanel
          events={timeline}
          title="Timeline Enterprise"
          description={
            latestRun
              ? `Último run: ${latestRun.fileName}`
              : "Sem runs recentes para narrar."
          }
        />
      </div>

      <DataQualityPanel summary={quality} tenantSlug={tenantSlug} compact />

      <PremiumPreviewTabs
        activeRunId={latestRun?.id ?? null}
        activeRunLabel={latestRun?.fileName ?? null}
      />

      <ExecutiveSection
        title="Atalhos rápidos"
        description={`${profileCount} perfis · ${learningCount} regras aprendidas · ${totalRuns} runs`}
        panel
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink
            title="Importar ficheiros"
            description="Excel/CSV para Financeiro, Vendas e OS"
            href={`/${tenantSlug}/integracoes/importar`}
          />
          <QuickLink
            title="Revisão assistida"
            description="Fila humana com confiança"
            href={`/${tenantSlug}/integracoes/revisar`}
          />
          <QuickLink
            title="Mapping Studio"
            description="Mapear colunas e perfis"
            href={`/${tenantSlug}/integracoes/mapeamentos`}
          />
          <QuickLink
            title="Regras aprendidas"
            description="Perfis e aprendizado por tenant"
            href={`/${tenantSlug}/integracoes/perfis`}
          />
        </div>
      </ExecutiveSection>

      <ExecutiveSection
        title="Pendências e rejeições"
        description="Monitorização rápida dos últimos runs com falha ou parcial."
        panel
      >
        {failedOrPartial === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            Sem pendências nos últimos runs carregados.
          </p>
        ) : (
          <p className="text-sm">
            {failedOrPartial} run(s) com status failed/partial.{" "}
            <Link
              className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${tenantSlug}/integracoes/historico`}
            >
              Ver histórico
            </Link>
          </p>
        )}
      </ExecutiveSection>

      <ExecutiveSection
        title="Importar Arquivos"
        description="Excel, CSV, PDF (texto), OFX e XML disponíveis. CNAB permanece em preparação."
        panel
      >
        <FormatGrid items={importFormats} />
      </ExecutiveSection>

      <ExecutiveSection
        title="Receber via APIs"
        description="Webhook e API REST — em preparação; veja o hub de conectores."
        panel
      >
        <FormatGrid items={apiFormats} />
      </ExecutiveSection>

      <ExecutiveSection
        title="Copiar e Colar"
        description="Tabela, CSV, JSON e texto estruturado — disponível via Importar (parser clipboard-input)."
        panel
      >
        <FormatGrid items={pasteFormats} />
      </ExecutiveSection>
    </ExecutivePage>
  );
}

function QuickLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Card className="border-border/60 transition-shadow motion-safe:hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" variant="outline" render={<Link href={href} />}>
          Abrir
        </Button>
      </CardContent>
    </Card>
  );
}

function FormatGrid({ items }: { items: FormatCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <item.icon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </CardTitle>
              {item.comingSoon ? (
                <Badge variant="secondary">Em breve</Badge>
              ) : item.note ? (
                <Badge variant="outline" className="text-[10px]">
                  Disponível
                </Badge>
              ) : null}
            </div>
            {item.note ? (
              <CardDescription className="text-xs">{item.note}</CardDescription>
            ) : null}
          </CardHeader>
          {item.href ? (
            <CardContent>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                render={<Link href={item.href} />}
              >
                Importar agora
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
