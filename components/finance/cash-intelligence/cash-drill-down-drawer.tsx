"use client";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  content: string | null;
  onClose: () => void;
};

export function CashDrillDownDrawer({ open, content, onClose }: Props) {
  if (!open || !content) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Drill-down de caixa"
    >
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-xl">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Drill-down</h2>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </header>
        <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed">
          {content}
        </pre>
      </aside>
    </div>
  );
}
