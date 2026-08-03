"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  BookOpen,
  Cable,
  Gauge,
  Plug,
  Radio,
  ScrollText,
  Settings2,
  Shield,
  Store,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IntegrationHubSnapshot } from "@/lib/integracoes/types";
import { cn } from "@/lib/utils";
import { gofTypography } from "@/lib/design-system";

type TabId =
  | "dashboard"
  | "api"
  | "marketplace"
  | "connections"
  | "webhooks"
  | "scheduler"
  | "events"
  | "logs"
  | "monitor"
  | "config";

type Props = {
  tenantSlug: string;
  snapshot: IntegrationHubSnapshot;
};

const TABS: Array<{ id: TabId; label: string; icon: typeof Plug }> = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "api", label: "API Center", icon: BookOpen },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "connections", label: "Connections", icon: Cable },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "scheduler", label: "Scheduler", icon: Activity },
  { id: "events", label: "Event Bus", icon: Radio },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "monitor", label: "Monitor", icon: Shield },
  { id: "config", label: "Config", icon: Settings2 },
];

const TAB_IDS = new Set(TABS.map((t) => t.id));

function parseTab(value: string | null): TabId {
  if (value && TAB_IDS.has(value as TabId)) return value as TabId;
  return "dashboard";
}

export function IntegrationHubView({ tenantSlug, snapshot }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const tab = parseTab(searchParams.get("tab"));
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  function selectTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const categories = useMemo(() => {
    const set = new Set(snapshot.marketplace.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [snapshot.marketplace]);

  const marketplaceFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snapshot.marketplace.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.vendor.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    });
  }, [snapshot.marketplace, category, query]);

  return (
    <div
      className="space-y-4"
      data-integration-hub=""
      data-sprint="30.8.1"
      data-live-external="false"
      data-credentials-stored="false"
      data-active-webhooks="false"
      data-tab={tab}
      data-tab-pending={pending ? "true" : "false"}
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={cn(gofTypography.title, "text-foreground")}>
              Integration Hub Enterprise
            </h1>
            <p className={cn(gofTypography.subtitle, "text-muted-foreground")}>
              Arquitetura completa preparada para produção — sem I/O externo,
              sem credenciais e sem webhooks ativos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" data-hub-guarantee="no-external">
              I/O externo OFF
            </Badge>
            <Badge variant="outline">Webhooks ativos: 0</Badge>
            <Badge variant="outline">Credenciais: não configurado</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/${tenantSlug}/integracoes/importar`}
            className="text-primary underline-offset-2 hover:underline"
          >
            Importação de arquivos
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href={`/${tenantSlug}/integracoes/conectores`}
            className="text-primary underline-offset-2 hover:underline"
          >
            Conectores legados
          </Link>
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Seções do Integration Hub"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`hub-panel-${t.id}`}
              id={`hub-tab-${t.id}`}
              onClick={() => selectTab(t.id)}
            >
              <Icon className="mr-1 size-3.5" aria-hidden />
              {t.label}
            </Button>
          );
        })}
      </div>

      {tab === "dashboard" ? (
        <section
          id="hub-panel-dashboard"
          role="tabpanel"
          aria-labelledby="hub-tab-dashboard"
          className="space-y-3"
          data-hub-block="dashboard"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi title="Status geral" value="Arquitetura pronta" />
            <Kpi
              title="Integrações ativas"
              value={String(snapshot.dashboard.integracoesAtivas)}
            />
            <Kpi
              title="Pendentes (catálogo)"
              value={String(snapshot.dashboard.integracoesPendentes)}
            />
            <Kpi
              title="Health Score"
              value={`${snapshot.dashboard.healthScore}`}
            />
            <Kpi
              title="Erros (mock DLQ)"
              value={String(snapshot.dashboard.erros)}
            />
            <Kpi
              title="Última sincronização"
              value={snapshot.dashboard.ultimaSincronizacao ?? "—"}
            />
            <Kpi
              title="Tempo médio"
              value={
                snapshot.dashboard.tempoMedioMs == null
                  ? "Sem base real"
                  : `${snapshot.dashboard.tempoMedioMs} ms`
              }
            />
            <Kpi
              title="Fila de eventos"
              value={String(snapshot.dashboard.filaEventos)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {snapshot.dashboard.healthLabel}
          </p>
        </section>
      ) : null}

      {tab === "api" ? (
        <section
          id="hub-panel-api"
          role="tabpanel"
          aria-labelledby="hub-tab-api"
          className="space-y-3"
          data-hub-block="api-center"
        >
          <h2 className="text-base font-semibold">API Center</h2>
          <p className="text-sm text-muted-foreground">
            Contratos internos documentados — nenhuma rota operacional publicada.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {snapshot.apiCenter.map((api) => (
              <Card key={api.id} className="shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{api.name}</CardTitle>
                    <Badge variant="outline">{api.status}</Badge>
                  </div>
                  <CardDescription>{api.module}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-mono text-xs">{api.endpoint}</p>
                  <p>Versão: {api.version}</p>
                  <p>Tokens: planejados (não emitidos)</p>
                  <p>Auth: {api.authExpected}</p>
                  <p>Rate limit: {api.rateLimit}</p>
                  <p>Ambiente: {api.environment}</p>
                  <p>Operacional: não</p>
                  <p className="text-muted-foreground">{api.documentation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "marketplace" ? (
        <section
          id="hub-panel-marketplace"
          role="tabpanel"
          aria-labelledby="hub-tab-marketplace"
          className="space-y-3"
          data-hub-block="marketplace"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              Marketplace · somente catálogo
            </h2>
            <Badge variant="outline">
              active=false · {marketplaceFiltered.length}
            </Badge>
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar integração, vendor ou categoria"
            aria-label="Buscar no marketplace"
            className="max-w-md"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro de categoria">
            {categories.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={category === c ? "default" : "outline"}
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
          </div>
          {marketplaceFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              Nenhuma integração no catálogo para este filtro.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {marketplaceFiltered.map((m) => (
                <Card key={m.id} className="shadow-xs" data-active="false">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{m.name}</CardTitle>
                    <CardDescription>
                      {m.vendor} · {m.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>{m.description}</p>
                    <p className="text-muted-foreground">
                      Auth esperado: {m.authExpected} · Caps:{" "}
                      {m.capabilities.join(", ")}
                    </p>
                    <Badge variant="secondary">Catálogo · não ativo</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "connections" ? (
        <section
          id="hub-panel-connections"
          role="tabpanel"
          aria-labelledby="hub-tab-connections"
          className="space-y-3"
          data-hub-block="connections"
        >
          <h2 className="text-base font-semibold">Connection Manager</h2>
          <p className="text-sm text-muted-foreground">
            Blueprints de autenticação — storesSecrets=false · não configurado.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {snapshot.connections.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.label}</CardTitle>
                  <CardDescription>{c.method}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Scopes: {c.scopesSupported ? "sim" : "não"}</p>
                  <p>
                    Rotação de chaves: {c.keyRotationSupported ? "sim" : "não"}
                  </p>
                  <p>Segredos: não armazenados</p>
                  <p className="text-muted-foreground">{c.notes}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "webhooks" ? (
        <section
          id="hub-panel-webhooks"
          role="tabpanel"
          aria-labelledby="hub-tab-webhooks"
          className="space-y-3"
          data-hub-block="webhooks"
        >
          <h2 className="text-base font-semibold">Webhook Center · mock</h2>
          <p className="text-sm text-muted-foreground">
            Replay e entregas são simulados — activeWebhooks=false.
          </p>
          <ul className="space-y-2">
            {snapshot.webhooks.map((w) => (
              <li key={w.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {w.direction} · {w.topic}
                  </span>
                  <Badge variant="outline">{w.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Retries: {w.retries} · Payload mock: {w.payloadPreview}
                </p>
                <pre
                  className="mt-2 overflow-auto rounded bg-muted/40 p-2 text-xs"
                  aria-label="Headers preview redacted"
                >
                  {JSON.stringify(w.headersPreview, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "scheduler" ? (
        <section
          id="hub-panel-scheduler"
          role="tabpanel"
          aria-labelledby="hub-tab-scheduler"
          className="space-y-3"
          data-hub-block="scheduler"
        >
          <h2 className="text-base font-semibold">Scheduler</h2>
          <p className="text-sm text-muted-foreground">
            Engine arquitetural — nenhum cron/worker externo ativo.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {snapshot.scheduler.map((j) => (
              <Card key={j.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{j.name}</CardTitle>
                  <CardDescription>{j.schedule}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Prioridade: {j.priority}</p>
                  <p>Status: {j.status}</p>
                  <p>
                    Concorrência: {j.concurrency} · Backoff: {j.backoffMs}ms
                  </p>
                  <p>
                    Próxima execução: {j.nextRunAt ?? "— (sem cron externo)"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "events" ? (
        <section
          id="hub-panel-eventbus"
          role="tabpanel"
          aria-labelledby="hub-tab-events"
          className="space-y-3"
          data-hub-block="eventbus"
        >
          <h2 className="text-base font-semibold">Event Bus</h2>
          <p className="text-sm text-muted-foreground">
            Publisher/consumer mock — externalDispatch=false.
          </p>
          <ul className="space-y-2">
            {snapshot.events.map((e) => (
              <li key={e.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{e.name}</span>
                  <Badge variant="outline">{e.status}</Badge>
                </div>
                <p className="text-muted-foreground">
                  {e.kind} · idempotency {e.idempotencyKey}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "logs" ? (
        <section
          id="hub-panel-logs"
          role="tabpanel"
          aria-labelledby="hub-tab-logs"
          className="space-y-3"
          data-hub-block="logs"
        >
          <h2 className="text-base font-semibold">Logs</h2>
          <ul className="max-h-96 space-y-2 overflow-auto">
            {snapshot.logs.map((l) => (
              <li key={l.id} className="rounded border px-3 py-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    [{l.area}] {l.message}
                  </span>
                  <Badge variant="outline">{l.level}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  latência {l.latencyMs ?? "—"} · payload redacted ·
                  tenant-scoped
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "monitor" ? (
        <section
          id="hub-panel-monitor"
          role="tabpanel"
          aria-labelledby="hub-tab-monitor"
          className="space-y-3"
          data-hub-block="monitor"
        >
          <h2 className="text-base font-semibold">Monitor Enterprise</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {snapshot.monitor.map((m) => (
              <Card key={m.id}>
                <CardHeader className="pb-1">
                  <CardDescription>{m.label}</CardDescription>
                  <CardTitle className="text-lg">{m.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "config" ? (
        <section
          id="hub-panel-config"
          role="tabpanel"
          aria-labelledby="hub-tab-config"
          className="space-y-3"
          data-hub-block="config"
        >
          <h2 className="text-base font-semibold">Centro de Configuração</h2>
          <p className="text-sm text-muted-foreground">
            Knobs em modo simulação — sem persistência remota e sem runtime
            externo.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {snapshot.config.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.label}</CardTitle>
                  <CardDescription>{c.value}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {c.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
