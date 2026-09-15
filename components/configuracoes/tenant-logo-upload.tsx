"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import {
  removeTenantLogoAction,
  uploadTenantLogoAction,
} from "@/lib/tenants/logo-actions";

type Props = {
  tenantSlug: string;
  currentLogoUrl: string | null;
  canManage: boolean;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // remove o prefixo "data:image/png;base64,"
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function TenantLogoUpload({
  tenantSlug,
  currentLogoUrl,
  canManage,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError("Imagem maior que 2MB.");
      return;
    }

    startTransition(async () => {
      const base64 = await fileToBase64(file);
      const result = await uploadTenantLogoAction(
        tenantSlug,
        base64,
        file.type,
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPreview(URL.createObjectURL(file));
    });

    e.target.value = "";
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeTenantLogoAction(tenantSlug);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPreview(null);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-[var(--surface-muted)]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo da empresa" className="size-full object-contain p-1.5" />
        ) : (
          <span className="text-[10px] text-muted-foreground">Sem logo</span>
        )}
      </div>

      {canManage ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
              disabled={pending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePick}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-3.5" aria-hidden />
              )}
              {preview ? "Trocar logo" : "Enviar logo"}
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={pending}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Remover
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP ou SVG · até 2MB · aparece no cabeçalho do painel
          </p>
          {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Só o proprietário ou administrador pode alterar a logo.
        </p>
      )}
    </div>
  );
}
