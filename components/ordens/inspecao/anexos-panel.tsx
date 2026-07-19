"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2, Trash2, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import {
  deleteOsAnexoAction,
  getOsAnexoSignedUrlAction,
  uploadOsAnexoAction,
} from "@/lib/ordens/inspecao-actions";
import type { OsAnexoRecord } from "@/lib/ordens/inspecao-storage-service";
import { cn } from "@/lib/utils";

const ETAPA_LABELS: Record<string, string> = {
  entrada: "Entrada",
  diagnostico: "Diagnóstico",
  orcamento: "Orçamento",
  execucao: "Execução",
  conclusao: "Conclusão",
  entrega: "Entrega",
  retorno: "Retorno",
  garantia: "Garantia",
  outro: "Outro",
};

type Props = {
  tenantSlug: string;
  osId: string;
  anexos: OsAnexoRecord[];
  onRefresh: () => void;
  disabled?: boolean;
};

export function AnexosPanel({
  tenantSlug,
  osId,
  anexos,
  onRefresh,
  disabled = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [etapa, setEtapa] = useState("entrada");
  const [legenda, setLegenda] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        window.alert(result.error ?? "Falha na operação.");
        return;
      }
      onRefresh();
    });
  }

  async function openPreview(anexoId: string) {
    const result = await getOsAnexoSignedUrlAction(tenantSlug, anexoId);
    if (!result.success) {
      window.alert(result.error ?? "Não foi possível abrir o arquivo.");
      return;
    }
    setPreviewUrl(result.signedUrl);
  }

  function handleUpload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("ordemServicoId", osId);
    fd.set("etapa", etapa);
    fd.set("legenda", legenda.trim() || file.name);
    run(async () => uploadOsAnexoAction(tenantSlug, fd));
    setLegenda("");
  }

  const sorted = [...anexos].sort(
    (a, b) =>
      a.ordem - b.ordem ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <>
      <SectionCard
        title="Fotos e anexos"
        description="Envie fotos e documentos relacionados à ordem de serviço."
        contentClassName="pt-0 space-y-4"
      >
        <div className="space-y-2 rounded-xl border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">Novo anexo</p>
          <div className="grid gap-2 md:grid-cols-2">
            <select
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              disabled={disabled || pending}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {Object.entries(ETAPA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="Legenda (opcional)"
              disabled={disabled || pending}
              className="h-9 text-sm"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            disabled={disabled || pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={disabled || pending}
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            onClick={() => fileRef.current?.click()}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileUp className="size-3.5" />
            )}
            Enviar arquivo
          </button>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP ou PDF · máx. 5 MB
          </p>
        </div>

        <ul className="space-y-2">
          {sorted.length === 0 ? (
            <li className="text-sm text-muted-foreground">Nenhum anexo ainda.</li>
          ) : (
            sorted.map((anexo) => (
              <li
                key={anexo.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={pending}
                    className="truncate font-medium underline-offset-2 hover:underline"
                    onClick={() => openPreview(anexo.id)}
                  >
                    {anexo.legenda ?? anexo.descricao ?? "Anexo"}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {ETAPA_LABELS[anexo.etapa] ?? anexo.etapa}
                    {anexo.mime_type ? ` · ${anexo.mime_type}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled || pending}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "text-destructive",
                  )}
                  onClick={() =>
                    run(() => deleteOsAnexoAction(tenantSlug, osId, anexo.id))
                  }
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </SectionCard>

      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Fechar"
            onClick={() => setPreviewUrl(null)}
          />
          <div className="relative max-h-[90vh] max-w-4xl">
            <button
              type="button"
              className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="size-4" />
            </button>
            {previewUrl.toLowerCase().includes(".pdf") ||
            previewUrl.includes("application/pdf") ? (
              <iframe
                src={previewUrl}
                title="Anexo PDF"
                className="h-[85vh] w-[min(90vw,720px)] rounded-lg bg-white"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Anexo"
                className="max-h-[85vh] max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
