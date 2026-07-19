"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import {
  CHECKLIST_CLASSIFICACAO_CONFIG,
  mapStatusToClassificacao,
  type ChecklistClassificacao,
} from "@/lib/ordens/checklist-classificacao";
import {
  deleteOsAnexoAction,
  getOsAnexoSignedUrlAction,
  updateOsChecklistClassificacaoAction,
  uploadOsAnexoAction,
} from "@/lib/ordens/inspecao-actions";
import { OS_CHECKLIST_CLASSIFICACAO } from "@/lib/ordens/validations";
import { cn } from "@/lib/utils";

export type ChecklistVisualItem = {
  id: string;
  item_codigo: string;
  item_label: string;
  status: string;
  classificacao?: string | null;
  categoria?: string | null;
  observacao?: string | null;
};

export type ChecklistAnexo = {
  id: string;
  checklist_item_id: string | null;
  legenda: string | null;
  descricao: string | null;
  mime_type: string | null;
};

type Props = {
  tenantSlug: string;
  osId: string;
  items: ChecklistVisualItem[];
  anexos: ChecklistAnexo[];
  onRefresh: () => void;
  disabled?: boolean;
};

function resolveClassificacao(item: ChecklistVisualItem): ChecklistClassificacao {
  if (
    item.classificacao &&
    OS_CHECKLIST_CLASSIFICACAO.includes(item.classificacao as ChecklistClassificacao)
  ) {
    return item.classificacao as ChecklistClassificacao;
  }
  return mapStatusToClassificacao(item.status);
}

export function ChecklistVisual({
  tenantSlug,
  osId,
  items,
  anexos,
  onRefresh,
  disabled = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [observacoes, setObservacoes] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.observacao ?? ""])),
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistVisualItem[]>();
    for (const item of items) {
      const cat = item.categoria?.trim() || "Geral";
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const anexosByItem = useMemo(() => {
    const map = new Map<string, ChecklistAnexo[]>();
    for (const anexo of anexos) {
      if (!anexo.checklist_item_id) continue;
      const list = map.get(anexo.checklist_item_id) ?? [];
      list.push(anexo);
      map.set(anexo.checklist_item_id, list);
    }
    return map;
  }, [anexos]);

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

  function saveClassificacao(itemId: string, classificacao: ChecklistClassificacao) {
    run(() =>
      updateOsChecklistClassificacaoAction(tenantSlug, osId, itemId, {
        classificacao,
        observacao: observacoes[itemId]?.trim() || null,
      }),
    );
  }

  function saveObservacao(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    run(() =>
      updateOsChecklistClassificacaoAction(tenantSlug, osId, itemId, {
        classificacao: resolveClassificacao(item),
        observacao: observacoes[itemId]?.trim() || null,
      }),
    );
  }

  async function openPreview(anexoId: string) {
    const result = await getOsAnexoSignedUrlAction(tenantSlug, anexoId);
    if (!result.success) {
      window.alert(result.error ?? "Não foi possível abrir a imagem.");
      return;
    }
    setPreviewUrl(result.signedUrl);
  }

  function uploadPhoto(itemId: string, file: File) {
    setUploadingItemId(itemId);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("ordemServicoId", osId);
    fd.set("etapa", "entrada");
    fd.set("checklistItemId", itemId);
    fd.set("legenda", file.name);
    startTransition(async () => {
      const result = await uploadOsAnexoAction(tenantSlug, fd);
      setUploadingItemId(null);
      if (!result.success) {
        window.alert(result.error ?? "Erro no upload.");
        return;
      }
      onRefresh();
    });
  }

  return (
    <>
      <SectionCard
        title="Checklist de entrada"
        description="Classifique cada item, registre observações e anexe fotos."
        contentClassName="pt-0 space-y-6"
      >
        {grouped.map(([categoria, catItems]) => (
          <div key={categoria} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{categoria}</h3>
            <ul className="space-y-3">
              {catItems.map((item) => {
                const current = resolveClassificacao(item);
                const itemAnexos = anexosByItem.get(item.id) ?? [];
                const isUploading = uploadingItemId === item.id && pending;

                return (
                  <li
                    key={item.id}
                    className="space-y-3 rounded-xl border border-border/60 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.item_label}</p>
                        <p className="text-xs text-muted-foreground">{item.item_codigo}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
                          CHECKLIST_CLASSIFICACAO_CONFIG[current].colorClass,
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            CHECKLIST_CLASSIFICACAO_CONFIG[current].dotClass,
                          )}
                        />
                        {CHECKLIST_CLASSIFICACAO_CONFIG[current].label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {OS_CHECKLIST_CLASSIFICACAO.map((value) => {
                        const cfg = CHECKLIST_CLASSIFICACAO_CONFIG[value];
                        const active = current === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={disabled || pending}
                            onClick={() => saveClassificacao(item.id, value)}
                            className={cn(
                              buttonVariants({
                                variant: active ? "default" : "outline",
                                size: "sm",
                              }),
                              "gap-1.5 text-xs",
                              !active && cfg.colorClass,
                            )}
                          >
                            <span className={cn("size-2 rounded-full", cfg.dotClass)} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={observacoes[item.id] ?? ""}
                        onChange={(e) =>
                          setObservacoes((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Observação (opcional)"
                        disabled={disabled || pending}
                        className="h-8 flex-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={disabled || pending}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        onClick={() => saveObservacao(item.id)}
                      >
                        Salvar obs.
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={(el) => {
                            fileInputs.current[item.id] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={disabled || pending}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadPhoto(item.id, file);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          disabled={disabled || pending || isUploading}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "gap-1.5",
                          )}
                          onClick={() => fileInputs.current[item.id]?.click()}
                        >
                          {isUploading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ImagePlus className="size-3.5" />
                          )}
                          Foto
                        </button>
                      </div>

                      {itemAnexos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {itemAnexos.map((anexo) => (
                            <div
                              key={anexo.id}
                              className="group relative flex items-center gap-1 rounded-lg border bg-muted/30 px-2 py-1 text-xs"
                            >
                              <button
                                type="button"
                                disabled={pending}
                                className="truncate max-w-32 underline-offset-2 hover:underline"
                                onClick={() => openPreview(anexo.id)}
                              >
                                {anexo.legenda ?? anexo.descricao ?? "Foto"}
                              </button>
                              <button
                                type="button"
                                disabled={disabled || pending}
                                className="text-destructive hover:text-destructive/80"
                                onClick={() =>
                                  run(() =>
                                    deleteOsAnexoAction(tenantSlug, osId, anexo.id),
                                  )
                                }
                                aria-label="Remover anexo"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item no checklist.</p>
        ) : null}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Anexo"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
