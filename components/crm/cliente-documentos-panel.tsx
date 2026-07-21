"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Input } from "@/components/ui/input";
import {
  CRM_DOCUMENTO_CATEGORIA_LABELS,
  CRM_DOCUMENTO_CATEGORIAS,
} from "@/lib/crm/constants";
import {
  deleteClienteDocumentoAction,
  getClienteDocumentoSignedUrlAction,
  uploadClienteDocumentoAction,
} from "@/lib/crm/actions";
import { formatClienteDate } from "@/lib/clientes/format";
import type { ClienteDocumento } from "@/types/crm";

type Props = {
  tenantSlug: string;
  clienteId: string;
  documentos: ClienteDocumento[];
  onRefresh: () => void;
};

export function ClienteDocumentosPanel({
  tenantSlug,
  clienteId,
  documentos,
  onRefresh,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [categoria, setCategoria] = useState<string>("outro");
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

  async function openDoc(id: string) {
    const result = await getClienteDocumentoSignedUrlAction(tenantSlug, id);
    if (!result.success || !result.signedUrl) {
      window.alert(
        (!result.success && "error" in result ? result.error : undefined) ??
          "Não foi possível abrir.",
      );
      return;
    }
    window.open(result.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <SectionCard title="Documentos">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          disabled={pending}
        >
          {CRM_DOCUMENTO_CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {CRM_DOCUMENTO_CATEGORIA_LABELS[c]}
            </option>
          ))}
        </select>
        <Input
          placeholder="Legenda"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          disabled={pending}
        />
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-muted"
          onClick={() => fileRef.current?.click()}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          Enviar PDF ou imagem
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("file", file);
            fd.set("clienteId", clienteId);
            fd.set("categoria", categoria);
            fd.set("legenda", legenda.trim() || file.name);
            run(() => uploadClienteDocumentoAction(tenantSlug, fd));
            e.target.value = "";
            setLegenda("");
          }}
        />
      </div>

      {documentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
      ) : (
        <ul className="divide-y">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
              <button
                type="button"
                className="text-left text-sm hover:underline"
                onClick={() => openDoc(doc.id)}
              >
                <span className="font-medium">{doc.legenda ?? doc.nome_arquivo}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {CRM_DOCUMENTO_CATEGORIA_LABELS[doc.categoria as keyof typeof CRM_DOCUMENTO_CATEGORIA_LABELS] ?? doc.categoria}
                  {" · "}
                  {formatClienteDate(doc.created_at)}
                </span>
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                onClick={() =>
                  run(() => deleteClienteDocumentoAction(tenantSlug, doc.id, clienteId))
                }
                aria-label="Excluir documento"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
