"use client";

import {
  AlertCircle,
  Clock,
  Link2,
  Plug,
  RefreshCw,
  Unplug,
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
import { EmptyState } from "@/components/ui/empty-state";
import type { ConnectorRegistryEntry } from "@/lib/import-engine/connectors/types";

type ConnectorsHubClientProps = {
  tenantSlug: string;
  connectors: ConnectorRegistryEntry[];
};

function statusBadge(status: ConnectorRegistryEntry["status"]) {
  switch (status) {
    case "connected":
      return <Badge variant="default">Conectado</Badge>;
    case "available":
      return <Badge variant="outline">Disponível</Badge>;
    case "disabled":
      return <Badge variant="secondary">Desabilitado</Badge>;
    case "error":
      return <Badge variant="destructive">Erro</Badge>;
    case "preparing":
    default:
      return <Badge variant="secondary">Em preparação</Badge>;
  }
}

export function ConnectorsHubClient({
  tenantSlug,
  connectors,
}: ConnectorsHubClientProps) {
  const preparingCount = connectors.filter((c) => c.status === "preparing").length;
  const connectedCount = connectors.filter((c) => c.status === "connected").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Total de conectores</CardDescription>
            <CardTitle className="text-2xl">{connectors.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Em preparação</CardDescription>
            <CardTitle className="text-2xl">{preparingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Conectados (ativos)</CardDescription>
            <CardTitle className="text-2xl">{connectedCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {connectedCount === 0
              ? "Nenhum conector ativo. Placeholders não contam como conectados."
              : null}
          </CardContent>
        </Card>
      </div>

      {connectors.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="Nenhum conector configurado"
          description="Os conectores Enterprise aparecerão aqui quando estiverem disponíveis."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {connectors.map((connector) => (
            <Card key={connector.id} className="border-border/60">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{connector.name}</span>
                    </CardTitle>
                    {connector.vendor ? (
                      <CardDescription className="mt-1">{connector.vendor}</CardDescription>
                    ) : null}
                  </div>
                  {statusBadge(connector.status)}
                </div>
                <CardDescription className="mt-2">{connector.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <RefreshCw className="size-3" aria-hidden />
                    Último sync: —
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="size-3" aria-hidden />
                    Volume: —
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="size-3" aria-hidden />
                    Erro: —
                  </div>
                  <div className="flex items-center gap-1">
                    <Plug className="size-3" aria-hidden />
                    Histórico: —
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{connector.preparingMessage}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Indisponível — conector em preparação"
                  >
                    Testar conexão
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Indisponível — conector em preparação"
                  >
                    <Unplug className="mr-1 size-3" aria-hidden />
                    Desconectar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    title="Indisponível — conector em preparação"
                  >
                    Ver histórico
                  </Button>
                </div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Indisponível nesta versão — não está conectado nem ativo.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tenant: {tenantSlug} — conectores Omie, Conta Azul, Bling e bancos permanecem em
        preparação até homologação; nenhum sync simulado está ativo.
      </p>
    </div>
  );
}
