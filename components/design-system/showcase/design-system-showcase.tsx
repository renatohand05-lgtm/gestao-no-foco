"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Inbox,
  RefreshCw,
  Search,
} from "lucide-react";

import { BrandLogo, BrandMark, BrandSplash } from "@/components/brand";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import {
  ExecutiveBadge,
  ExecutiveButton,
  ExecutiveCard,
  ExecutiveDivider,
  ExecutiveEmptyState,
  ExecutiveFilter,
  ExecutiveFilterField,
  ExecutiveHeader,
  ExecutiveIconButton,
  ExecutiveLoading,
  ExecutivePage,
  ExecutivePanel,
  ExecutivePanelHeader,
  ExecutiveProgress,
  ExecutiveSection,
  ExecutiveSkeleton,
  ExecutiveSkeletonCard,
  ExecutiveStatus,
  ExecutiveTable,
  MetricCard,
} from "@/components/executive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { brandConfig, brandPalette } from "@/config/brand";
import {
  gofColors,
  gofMotion,
  gofRadius,
  gofShadow,
  gofSpacing,
  gofTypography,
} from "@/lib/design-system/foundation";
import { gofControl, gofFocusRing } from "@/lib/design-system/primitives";
import {
  LEGACY_AUDIT,
  OFFICIAL_COMPONENTS,
  PRODUCT_BLOCKS,
  SHOWCASE_CATEGORIES,
  VIEWPORTS,
  type CatalogComponent,
} from "@/lib/design-system/catalog/showcase-catalog";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  tenantName: string;
};

type ViewportId = (typeof VIEWPORTS)[number]["id"];

function DocCard({ item }: { item: CatalogComponent }) {
  return (
    <article
      className={cn("space-y-2 border border-border/60 p-4", gofRadius.lg)}
      aria-label={item.name}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={gofTypography.title}>{item.name}</h3>
        <ExecutiveBadge
          tone={
            item.status === "oficial"
              ? "success"
              : item.status === "legado" || item.status === "deprecado"
                ? "warning"
                : "neutral"
          }
        >
          {item.status}
        </ExecutiveBadge>
      </div>
      <p className={gofTypography.subtitle}>{item.description}</p>
      <dl className={cn("grid gap-1 text-xs sm:grid-cols-2", gofTypography.caption)}>
        <div>
          <dt className="font-semibold text-foreground">Quando usar</dt>
          <dd>{item.whenToUse}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Quando não usar</dt>
          <dd>{item.whenNotToUse}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-foreground">Tokens</dt>
          <dd>{item.tokens.join(" · ")}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-foreground">Path</dt>
          <dd className="font-mono">{item.path}</dd>
        </div>
      </dl>
      <pre
        className={cn(
          "overflow-x-auto bg-muted/50 p-3 font-mono text-[11px]",
          gofRadius.md,
        )}
      >
        {item.codeSample}
      </pre>
    </article>
  );
}

function SectionShell({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      className={cn(
        "scroll-mt-24 border border-border/60 bg-[var(--brand-white)]",
        gofRadius.lg,
        gofMotion.fade,
      )}
      open={defaultOpen}
    >
      <summary
        className={cn(
          "cursor-pointer list-none px-4 py-3 sm:px-5",
          gofFocusRing,
        )}
      >
        <span className={gofTypography.title}>{title}</span>
        <span className={cn("mt-1 block", gofTypography.subtitle)}>
          {description}
        </span>
      </summary>
      <div className="space-y-4 border-t border-border/50 px-4 py-4 sm:px-5">
        {children}
      </div>
    </details>
  );
}

/**
 * Showcase oficial ? sem dados de negócio (Gate 19.5 / hardening 19.6).
 */
export function DesignSystemShowcase({ tenantSlug, tenantName }: Props) {
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [query, setQuery] = useState("");

  const width = VIEWPORTS.find((v) => v.id === viewport)?.width ?? 1440;

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHOWCASE_CATEGORIES;
    return SHOWCASE_CATEGORIES.filter((c) =>
      c.label.toLowerCase().includes(q),
    );
  }, [query]);

  const demoRows: Array<{ id: string; nome: string; status: string }> = [
    { id: "1", nome: "Exemplo A", status: "Ativo" },
    { id: "2", nome: "Exemplo B", status: "Pendente" },
  ];
  const emptyRows: Array<{ id: string; nome: string; status: string }> = [];

  return (
    <div
      data-design-system-showcase=""
      data-no-business-data="true"
      className="min-w-0 overflow-x-hidden"
    >
      <ExecutivePage
        width="full"
        spacing="loose"
        className="min-w-0 overflow-x-hidden"
      >
        <ExecutiveHeader
          title="Design System"
          description={`${brandConfig.name} · ${brandConfig.edition} · ${tenantName}`}
          actions={
            <ExecutiveBadge tone="info" variant="outline">
              Interno · owner/admin
            </ExecutiveBadge>
          }
        />

        <section
          aria-label="Playground"
          className={cn(
            "sticky top-14 z-20 space-y-3 border border-border/60 bg-[var(--brand-white)]/95 p-3 backdrop-blur sm:p-4",
            gofRadius.lg,
          )}
          data-showcase-playground=""
        >
          <p
            className={cn(
              gofTypography.caption,
              "text-[var(--brand-gold)] uppercase tracking-[0.12em]",
            )}
          >
            Playground técnico
          </p>
          <div className="flex flex-wrap gap-2">
            {VIEWPORTS.map((v) => (
              <Button
                key={v.id}
                type="button"
                size="sm"
                variant={viewport === v.id ? "default" : "outline"}
                className={cn("min-h-11", gofFocusRing)}
                aria-pressed={viewport === v.id}
                onClick={() => setViewport(v.id)}
              >
                {v.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={reduceMotion ? "default" : "outline"}
              className={cn("min-h-11", gofFocusRing)}
              aria-pressed={reduceMotion}
              onClick={() => setReduceMotion((x) => !x)}
            >
              Reduzir movimento
            </Button>
          </div>
          <p className={gofTypography.caption}>
            Preview max-width: {width}px · tema light · preferências não
            persistidas.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar categorias?"
              className="h-11 pl-8"
              aria-label="Filtrar categorias do showcase"
            />
          </div>
          <nav
            aria-label="Categorias do Design System"
            className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
          >
            {filteredNav.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className={cn(
                  "inline-flex min-h-9 items-center border border-border/60 px-2.5 text-xs font-medium",
                  gofRadius.sm,
                  gofFocusRing,
                )}
              >
                {c.label}
              </a>
            ))}
          </nav>
        </section>

        <div
          className={cn(
            "mx-auto w-full min-w-0 space-y-4 overflow-x-hidden transition-[max-width] duration-200",
            reduceMotion && "motion-reduce:transition-none [&_*]:!animate-none",
          )}
          style={{ maxWidth: Math.min(width, 1920) }}
          data-showcase-preview=""
        >
          <SectionShell
            id="brand"
            title="Brand"
            description="Identidade oficial Gestão."
            defaultOpen
          >
            <div className="flex flex-wrap items-end gap-6">
              <BrandMark size="lg" />
              <BrandLogo markSize="md" showSubtitle showEdition />
            </div>
            <p className={gofTypography.body}>{brandConfig.slogan}</p>
            {OFFICIAL_COMPONENTS.filter((c) => c.category === "brand").map(
              (c) => (
                <DocCard key={c.name} item={c} />
              ),
            )}
          </SectionShell>

          <SectionShell
            id="foundations"
            title="Foundations"
            description="Tokens gof* ? fonte única."
            defaultOpen
          >
            <p className={gofTypography.subtitle}>
              Prefixo oficial: <code className="font-mono text-xs">gof*</code>.
              Camadas legado: <code className="font-mono text-xs">ex*</code>,{" "}
              <code className="font-mono text-xs">ds*</code>.
            </p>
          </SectionShell>

          <SectionShell
            id="typography"
            title="Typography"
            description="Escala tipográfica gof."
          >
            <div className="space-y-2">
              <p className={gofTypography.title}>Title ? Space Grotesk</p>
              <p className={gofTypography.subtitle}>Subtitle ? apoio</p>
              <p className={gofTypography.body}>Body ? leitura contínua.</p>
              <p className={gofTypography.caption}>Caption ? metadados</p>
              <p className={gofTypography.mono}>Mono ? 1.234,56</p>
            </div>
          </SectionShell>

          <SectionShell id="colors" title="Colors" description="Brand + semânticas.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(brandPalette).map(([name, value]) => (
                <div key={name} className="space-y-1">
                  <div
                    className={cn("h-12 border border-border/40", gofRadius.md)}
                    style={{ backgroundColor: value }}
                    aria-hidden
                  />
                  <p className={gofTypography.caption}>{name}</p>
                  <p className="font-mono text-[10px]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(
                ["primary", "success", "warning", "danger", "info"] as const
              ).map((key) => (
                <div
                  key={key}
                  className={cn("p-3", gofRadius.md, gofColors[key].soft)}
                >
                  <p className="text-xs font-semibold capitalize">{key}</p>
                  <p className="font-mono text-[10px]">{gofColors[key].hex}</p>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="spacing"
            title="Spacing"
            description="Escala gofSpacing."
          >
            <div className="space-y-2">
              {Object.entries(gofSpacing).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className={cn("w-10", gofTypography.caption)}>{k}</span>
                  <div
                    className={cn(
                      "h-3 bg-[var(--brand-gold)]/40",
                      v.replace("gap-", "w-"),
                    )}
                  />
                  <code className="font-mono text-[10px]">{v}</code>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="radius" title="Radius" description="gofRadius.">
            <div className="flex flex-wrap gap-3">
              {Object.entries(gofRadius).map(([k, v]) => (
                <div
                  key={k}
                  className={cn(
                    "flex size-16 items-center justify-center border border-border bg-muted/40 text-xs",
                    v,
                  )}
                >
                  {k}
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="shadows" title="Shadows" description="gofShadow.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(gofShadow).map(([k, v]) => (
                <div
                  key={k}
                  className={cn(
                    "border border-border/40 bg-[var(--brand-white)] p-4 text-xs",
                    gofRadius.lg,
                    v,
                  )}
                >
                  {k}
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="motion"
            title="Motion"
            description="gofMotion · máx. 250ms."
          >
            <div className="flex flex-wrap gap-3">
              {(Object.keys(gofMotion) as Array<keyof typeof gofMotion>).map(
                (k) => (
                  <span
                    key={k}
                    className={cn(
                      "border border-border/60 px-3 py-2 text-xs",
                      gofRadius.md,
                      gofMotion[k],
                    )}
                  >
                    {k}
                  </span>
                ),
              )}
            </div>
          </SectionShell>

          <SectionShell id="icons" title="Icons" description="Lucide via DsIcon.">
            <p className={gofTypography.subtitle}>
              Ícones apenas Lucide. Tamanhos via{" "}
              <code className="font-mono text-xs">DsIcon</code>.
            </p>
            <div className="flex gap-3">
              <Inbox className="size-5" aria-hidden />
              <Search className="size-5" aria-hidden />
              <RefreshCw className="size-5" aria-hidden />
              <AlertCircle className="size-5" aria-hidden />
            </div>
          </SectionShell>

          <SectionShell
            id="buttons"
            title="Buttons"
            description="ExecutiveButton + estados."
          >
            <div className="flex flex-wrap gap-2">
              <ExecutiveButton>Default</ExecutiveButton>
              <ExecutiveButton variant="outline">Outline</ExecutiveButton>
              <ExecutiveButton variant="destructive">Danger</ExecutiveButton>
              <ExecutiveButton loading>Loading</ExecutiveButton>
              <ExecutiveButton disabled>Disabled</ExecutiveButton>
              <ExecutiveIconButton icon={RefreshCw} label="Atualizar" />
            </div>
            {OFFICIAL_COMPONENTS.filter((c) => c.category === "buttons").map(
              (c) => (
                <DocCard key={c.name} item={c} />
              ),
            )}
          </SectionShell>

          <SectionShell id="inputs" title="Inputs" description="Input oficial.">
            <div className="max-w-sm space-y-2">
              <Label htmlFor="ds-input-demo">E-mail</Label>
              <Input
                id="ds-input-demo"
                placeholder="voce@empresa.com"
                className="h-11"
              />
              <Input disabled placeholder="Disabled" className="h-11" />
            </div>
          </SectionShell>

          <SectionShell
            id="forms"
            title="Form Controls"
            description="Oficial: gofControl. Sem ExecutiveSelect/Date/Toggle nesta sprint."
          >
            <div className="max-w-sm space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ds-select-demo">Select nativo</Label>
                <select
                  id="ds-select-demo"
                  className={gofControl}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Escolha?
                  </option>
                  <option value="a">Opção A</option>
                  <option value="b">Opção B</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ds-date-demo">Date nativo</Label>
                <input id="ds-date-demo" type="date" className={gofControl} />
              </div>
              <p className={gofTypography.caption}>
                Focus: <code className="font-mono">gofFocusRing</code> via{" "}
                <code className="font-mono">gofControl</code>. Wrappers
                dedicados = DEFERRED.
              </p>
            </div>
            {OFFICIAL_COMPONENTS.filter((c) => c.category === "forms").map(
              (c) => (
                <DocCard key={c.name} item={c} />
              ),
            )}
          </SectionShell>

          <SectionShell id="badges" title="Badges" description="Tones × variants.">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "success",
                  "warning",
                  "danger",
                  "info",
                  "neutral",
                  "primary",
                ] as const
              ).map((tone) =>
                (["soft", "solid", "outline"] as const).map((variant) => (
                  <ExecutiveBadge
                    key={`${tone}-${variant}`}
                    tone={tone}
                    variant={variant}
                  >
                    {tone}/{variant}
                  </ExecutiveBadge>
                )),
              )}
            </div>
          </SectionShell>

          <SectionShell id="status" title="Status" description="Status + Progress.">
            <div className="flex flex-wrap gap-2">
              <ExecutiveStatus label="Saudável" tone="success" />
              <ExecutiveStatus label="Atenção" tone="warning" />
              <ExecutiveStatus label="Crítico" tone="danger" />
              <ExecutiveStatus label="Info" tone="info" />
            </div>
            <ExecutiveProgress value={72} label="Atingimento" tone="success" />
          </SectionShell>

          <SectionShell id="cards" title="Cards" description="ExecutiveCard.">
            <div className="grid gap-3 sm:grid-cols-2">
              <ExecutiveCard padding={20}>Card informativo</ExecutiveCard>
              <ExecutiveCard padding={20} interactive>
                Card interativo
              </ExecutiveCard>
            </div>
          </SectionShell>

          <SectionShell
            id="kpis"
            title="KPIs"
            description="MetricCard com fixtures locais."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Exemplo"
                value="?"
                hint="Fixture local"
                tone="neutral"
              />
              <MetricCard label="Sucesso" value="100%" tone="success" />
              <MetricCard
                label="Alerta"
                value="72%"
                tone="warning"
                emphasize
              />
            </div>
          </SectionShell>

          <SectionShell id="panels" title="Panels" description="ExecutivePanel.">
            <ExecutivePanel>
              <ExecutivePanelHeader
                title="Painel demo"
                description="Conteúdo de painel sem dados reais."
              />
            </ExecutivePanel>
          </SectionShell>

          <SectionShell
            id="tables"
            title="Tables"
            description="Empty / rows fixtures."
          >
            <ExecutiveTable
              columns={[
                { id: "nome", header: "Nome", cell: (r) => r.nome },
                { id: "status", header: "Status", cell: (r) => r.status },
              ]}
              rows={demoRows}
              getRowId={(r) => r.id}
            />
            <ExecutiveTable
              columns={[{ id: "nome", header: "Nome", cell: (r) => r.nome }]}
              rows={emptyRows}
              getRowId={(r) => r.id}
              emptyMessage="Nenhum registro (empty demo)"
            />
          </SectionShell>

          <SectionShell id="filters" title="Filters" description="ExecutiveFilter.">
            <ExecutiveFilter label="Filtros demo">
              <ExecutiveFilterField label="Busca">
                <Input placeholder="Filtrar?" className="h-9" />
              </ExecutiveFilterField>
            </ExecutiveFilter>
          </SectionShell>

          <SectionShell
            id="navigation"
            title="Navigation"
            description="Âncoras desta página."
          >
            <p className={gofTypography.subtitle}>
              Navegação do showcase via âncoras. Sem dados sensíveis.
            </p>
          </SectionShell>

          <SectionShell
            id="header"
            title="Header"
            description="ExecutiveHeader."
          >
            <ExecutiveHeader
              title="Módulo exemplo"
              description="Greeting oficial fica só no Dashboard Header ? não duplicar."
            />
            {OFFICIAL_COMPONENTS.filter((c) => c.category === "header").map(
              (c) => (
                <DocCard key={c.name} item={c} />
              ),
            )}
          </SectionShell>

          <SectionShell id="sidebar" title="Sidebar" description="AppSidebar Brand.">
            <p className={gofTypography.subtitle}>
              Sidebar real no AppShell. Showcase não remonta o shell completo.
            </p>
          </SectionShell>

          <SectionShell id="dialogs" title="Dialogs" description="Dialog acessível.">
            <Dialog>
              <DialogTrigger
                render={
                  <Button type="button" variant="outline" className="min-h-11" />
                }
              >
                Abrir dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog demo</DialogTitle>
                  <DialogDescription>
                    Sem dados sensíveis. Feche com Esc ou botão.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </SectionShell>

          <SectionShell id="drawers" title="Drawers" description="Sheet (drawer).">
            <Sheet>
              <SheetTrigger
                render={
                  <Button type="button" variant="outline" className="min-h-11" />
                }
              >
                Abrir drawer
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Drawer demo</SheetTitle>
                  <SheetDescription>
                    Preview técnico sem persistência.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </SectionShell>

          <SectionShell
            id="loading"
            title="Loading"
            description="BrandSplash + ExecutiveLoading."
          >
            <BrandSplash
              className="min-h-[28vh] border border-border/40"
              label="Splash demo"
            />
            <ExecutiveLoading label="Loading de bloco" />
            {OFFICIAL_COMPONENTS.filter((c) => c.category === "loading").map(
              (c) => (
                <DocCard key={c.name} item={c} />
              ),
            )}
          </SectionShell>

          <SectionShell
            id="skeletons"
            title="Skeletons"
            description="ExecutiveSkeleton*."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ExecutiveSkeleton heightClassName="h-8" widthClassName="w-2/3" />
              <ExecutiveSkeletonCard />
            </div>
          </SectionShell>

          <SectionShell
            id="empty"
            title="Empty States"
            description="ExecutiveEmptyState."
          >
            <ExecutiveEmptyState
              icon={Inbox}
              title="Sem registros"
              description="Empty oficial ? sem dados fictícios de negócio."
              action={{ label: "Entendi", onClick: () => undefined }}
            />
          </SectionShell>

          <SectionShell
            id="errors"
            title="Error States"
            description="Padrão de erro apresentacional."
          >
            <ExecutiveEmptyState
              icon={AlertCircle}
              title="Falha ao carregar seção"
              description="Mensagem genérica. Sem stack/secrets."
            />
          </SectionShell>

          <SectionShell
            id="charts"
            title="Charts"
            description="Sem gráficos pesados no showcase."
          >
            <p className={gofTypography.subtitle}>
              Charts de produto vivem no Dashboard. Aqui só a regra: sem séries
              reais.
            </p>
            <ExecutiveDivider label="Performance" />
          </SectionShell>

          <SectionShell
            id="executive-blocks"
            title="Executive Blocks"
            description="Blocos Wave 1 ? demos leves."
          >
            <DashboardQuickActions tenantSlug={tenantSlug} />
            {PRODUCT_BLOCKS.filter((c) => c.category === "executive-blocks").map(
              (c) => (
                <DocCard key={c.name} item={c} />
              ),
            )}
          </SectionShell>

          <SectionShell
            id="onboarding"
            title="Onboarding"
            description="Cards e checklist."
          >
            {PRODUCT_BLOCKS.filter((c) => c.category === "onboarding").map(
              (c) => (
                <DocCard key={c.name} item={c} />
              ),
            )}
            <ExecutiveSection
              title="Regra"
              description="Máx. 4 passos · Pular sempre · sem bloquear."
              panel
            >
              <p className={gofTypography.caption}>
                Ver <code className="font-mono">/primeiro-acesso</code> e{" "}
                <code className="font-mono">lib/onboarding/premium-flow.ts</code>
                .
              </p>
            </ExecutiveSection>
          </SectionShell>

          <SectionShell
            id="legacy"
            title="Legacy Audit"
            description="Mapa de migração."
          >
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[40rem] text-left text-xs"
                data-legacy-audit=""
              >
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="py-2 pr-2">Componente</th>
                    <th className="py-2 pr-2">Substituto</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Risco</th>
                    <th className="py-2">Sprint</th>
                  </tr>
                </thead>
                <tbody>
                  {LEGACY_AUDIT.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-border/40 align-top"
                    >
                      <td className="py-2 pr-2 font-medium">{row.name}</td>
                      <td className="py-2 pr-2">{row.substitute}</td>
                      <td className="py-2 pr-2">{row.status}</td>
                      <td className="py-2 pr-2">{row.risk}</td>
                      <td className="py-2">{row.sprint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {LEGACY_AUDIT.map((row) => (
              <p key={`${row.name}-rec`} className={gofTypography.caption}>
                <strong>{row.name}:</strong> {row.recommendation} ·{" "}
                {row.filesHint}
              </p>
            ))}
          </SectionShell>
        </div>
      </ExecutivePage>
    </div>
  );
}
