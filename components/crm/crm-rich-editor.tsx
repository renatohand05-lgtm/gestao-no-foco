"use client";

import { Bold, Italic, List } from "lucide-react";
import { useCallback, useRef } from "react";

import { cn } from "@/lib/utils";

type CrmRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CrmRichEditor({
  value,
  onChange,
  placeholder = "Escreva aqui…",
  disabled = false,
  className,
}: CrmRichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  const exec = useCallback((command: string) => {
    document.execCommand(command, false);
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
        <button
          type="button"
          disabled={disabled}
          className="rounded p-1.5 hover:bg-muted disabled:opacity-50"
          onClick={() => exec("bold")}
          aria-label="Negrito"
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          className="rounded p-1.5 hover:bg-muted disabled:opacity-50"
          onClick={() => exec("italic")}
          aria-label="Itálico"
        >
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          className="rounded p-1.5 hover:bg-muted disabled:opacity-50"
          onClick={() => exec("insertUnorderedList")}
          aria-label="Lista"
        >
          <List className="size-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        className={cn(
          "min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
          "empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          disabled && "opacity-60",
        )}
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
      />
    </div>
  );
}

/** Renderiza HTML de observação com sanitização básica. */
export function CrmRichContent({ html }: { html: string }) {
  const safe = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
  return (
    <div
      className="prose prose-sm max-w-none text-sm text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
