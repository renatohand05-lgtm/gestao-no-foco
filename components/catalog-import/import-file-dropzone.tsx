"use client";

import { useRef, useState } from "react";

import { IMPORT_LIMIT_MB_CLIENT_DEFAULTS } from "@/lib/import-engine/import-file-limits";
import { cn } from "@/lib/utils";

export type SelectedImportFile = {
  file: File;
  name: string;
  size: number;
  format: string;
};

type Props = {
  accept: string;
  disabled?: boolean;
  label?: string;
  formatsHint?: string;
  onFile: (selected: SelectedImportFile | null) => void;
  selected: SelectedImportFile | null;
};

function formatLabel(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) return "XLSX";
  if (lower.endsWith(".xls")) return "XLS";
  if (lower.endsWith(".csv")) return "CSV";
  if (lower.endsWith(".xml")) return "XML";
  if (lower.endsWith(".pdf")) return "PDF";
  return "arquivo";
}

function clientLimitMb(name: string): number {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xml")) return IMPORT_LIMIT_MB_CLIENT_DEFAULTS.xml;
  if (lower.endsWith(".csv")) return IMPORT_LIMIT_MB_CLIENT_DEFAULTS.csv;
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return IMPORT_LIMIT_MB_CLIENT_DEFAULTS.xlsx;
  }
  if (lower.endsWith(".pdf")) return IMPORT_LIMIT_MB_CLIENT_DEFAULTS.pdf;
  return IMPORT_LIMIT_MB_CLIENT_DEFAULTS.default;
}

export function ImportFileDropzone({
  accept,
  disabled,
  label = "Selecionar arquivo",
  formatsHint,
  onFile,
  selected,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function applyFile(file: File | null | undefined) {
    setLocalError(null);
    if (!file) {
      onFile(null);
      return;
    }
    if (file.size <= 0) {
      setLocalError("Arquivo vazio.");
      onFile(null);
      return;
    }
    const limitMb = clientLimitMb(file.name);
    const fileMb = file.size / (1024 * 1024);
    if (fileMb > limitMb) {
      const shown =
        fileMb < 10 ? fileMb.toFixed(1) : String(Math.round(fileMb * 10) / 10);
      setLocalError(
        `Este arquivo possui ${shown} MB. O limite permitido para este formato é ${limitMb} MB.`,
      );
      onFile(null);
      return;
    }
    onFile({
      file,
      name: file.name,
      size: file.size,
      format: formatLabel(file.name),
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm transition-colors",
          dragOver ? "border-primary bg-muted/40" : "border-muted-foreground/40",
          disabled && "opacity-50",
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          applyFile(e.dataTransfer.files?.[0]);
        }}
        aria-label={label}
      >
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          Arraste e solte ou clique para escolher no computador
        </span>
        {formatsHint ? (
          <span className="text-xs text-muted-foreground">{formatsHint}</span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          applyFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {selected ? (
        <div
          className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
          role="status"
        >
          <div>
            <strong>Arquivo:</strong> {selected.name}
          </div>
          <div>
            <strong>Formato:</strong> {selected.format} ·{" "}
            <strong>Tamanho:</strong> {(selected.size / 1024).toFixed(1)} KB
          </div>
          <div className="text-muted-foreground">
            Status: arquivo selecionado — execute o preview antes de confirmar
          </div>
        </div>
      ) : null}
      {localError ? (
        <p className="text-sm text-destructive" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
