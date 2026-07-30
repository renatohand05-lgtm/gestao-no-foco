"use client";

/**
 * Sprint 22.5.1 — Componente de upload compartilhado pela Import Engine.
 * Movido de components/finance/import/import-upload-zone.tsx (Sprint 22.5),
 * que agora reexporta este componente para não duplicar UI entre módulos.
 */
import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  onFile: (file: File) => void;
  accept?: string;
};

export function ImportUploadZone({
  disabled,
  onFile,
  accept = ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    startTransition(() => onFile(file));
  }

  return (
    <div
      data-import-upload
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
        dragging
          ? "border-[var(--brand-blue)] bg-[var(--brand-blue)]/5"
          : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/40">
        {dragging ? (
          <Upload className="size-5 text-[var(--brand-blue)]" />
        ) : (
          <FileSpreadsheet className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Arraste o arquivo aqui ou selecione
        </p>
        <p className="text-xs text-muted-foreground">
          Formatos: .xlsx, .xls, .csv · até 15 MB
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        Selecionar arquivo
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
