"use client";

import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildDashboardSearchParams } from "@/lib/dashboard/filter-storage";
import type { DashboardExecutiveData } from "@/types/dashboard-executive";

type DashboardActionsProps = {
  tenantSlug: string;
  tenantName: string;
  data: DashboardExecutiveData;
};

type ExportModule = typeof import("@/lib/dashboard/export");

async function loadExportModule(): Promise<ExportModule> {
  return import("@/lib/dashboard/export");
}

export function DashboardActions({
  tenantSlug,
  tenantName,
  data,
}: DashboardActionsProps) {
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const shareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    const params = buildDashboardSearchParams(data.filters);
    return `${window.location.origin}/${tenantSlug}/dashboard?${params.toString()}`;
  }, [data.filters, tenantSlug]);

  const handleShare = useCallback(async () => {
    const url = shareUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Dashboard — ${tenantName}`,
          text: `Dashboard executivo de ${tenantName}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setExportError("Não foi possível copiar o link.");
    }
  }, [shareUrl, tenantName]);

  const runExport = useCallback(
    (
      pick: (
        mod: ExportModule,
      ) => (payload: DashboardExecutiveData, name: string) => void,
    ) => {
      setExportError(null);
      startTransition(() => {
        void loadExportModule()
          .then((mod) => {
            pick(mod)(data, tenantName);
          })
          .catch((error) => {
            setExportError(
              error instanceof Error ? error.message : "Falha ao exportar.",
            );
          });
      });
    },
    [data, tenantName],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        runExport((mod) => mod.exportDashboardCsv);
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleShare();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShare, runExport]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" aria-label="Exportar dashboard">
              <Download className="size-4" aria-hidden />
              Exportar
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => runExport((mod) => mod.exportDashboardPdf)}
          >
            <FileText className="size-4" aria-hidden />
            Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => runExport((mod) => mod.exportDashboardExcel)}
          >
            <FileSpreadsheet className="size-4" aria-hidden />
            Exportar Excel
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => runExport((mod) => mod.exportDashboardCsv)}
          >
            <Download className="size-4" aria-hidden />
            Exportar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleShare()}
        aria-label="Compartilhar dashboard"
      >
        {copied ? (
          <Check className="size-4 text-emerald-600" aria-hidden />
        ) : (
          <Share2 className="size-4" aria-hidden />
        )}
        {copied ? "Link copiado" : "Compartilhar"}
      </Button>

      {exportError ? (
        <p className="text-xs text-rose-600" role="alert">
          {exportError}
        </p>
      ) : null}

      <span className="sr-only">
        Atalhos: Ctrl+E exportar CSV, Ctrl+S compartilhar
      </span>
    </div>
  );
}
