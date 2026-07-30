"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Copy,
  FileSearch,
  Layers,
  ListTree,
  Map,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { ExecutiveEmptyState } from "@/components/executive";
import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type PremiumPreviewTabId =
  | "resumo"
  | "dados"
  | "baixa-confianca"
  | "erros"
  | "duplicidades"
  | "validacoes"
  | "mapeamento"
  | "impacto"
  | "auditoria";

export type PremiumPreviewTab = {
  id: PremiumPreviewTabId;
  label: string;
  icon: LucideIcon;
};

export const PREMIUM_PREVIEW_TABS: PremiumPreviewTab[] = [
  { id: "resumo", label: "Resumo", icon: Sparkles },
  { id: "dados", label: "Dados", icon: ListTree },
  { id: "baixa-confianca", label: "Baixa confiança", icon: AlertTriangle },
  { id: "erros", label: "Erros", icon: AlertTriangle },
  { id: "duplicidades", label: "Duplicidades", icon: Copy },
  { id: "validacoes", label: "Validações", icon: Shield },
  { id: "mapeamento", label: "Mapeamento", icon: Map },
  { id: "impacto", label: "Impacto", icon: Layers },
  { id: "auditoria", label: "Auditoria", icon: FileSearch },
];

type Props = {
  /** Run ativo — quando ausente, tabs ficam em estado estrutural/desabilitado */
  activeRunId?: string | null;
  activeRunLabel?: string | null;
  className?: string;
};

const TAB_EMPTY_COPY: Record<
  PremiumPreviewTabId,
  { title: string; description: string }
> = {
  resumo: {
    title: "Resumo indisponível",
    description: "Selecione ou conclua uma importação para ver o resumo executivo.",
  },
  dados: {
    title: "Dados não carregados",
    description: "Pré-visualização tabular aguarda um run ativo.",
  },
  "baixa-confianca": {
    title: "Sem linhas de baixa confiança",
    description: "Nenhum run ativo — use Revisar para fila humana.",
  },
  erros: {
    title: "Sem erros listados",
    description: "Erros aparecem aqui quando um run reporta falhas.",
  },
  duplicidades: {
    title: "Duplicidades não analisadas",
    description: "Detecção de duplicados requer run em curso ou concluído.",
  },
  validacoes: {
    title: "Validações pendentes",
    description: "Regras de validação serão exibidas com dados reais do run.",
  },
  mapeamento: {
    title: "Mapeamento indisponível",
    description: "Abra o Mapping Studio ou conclua detecção de colunas.",
  },
  impacto: {
    title: "Impacto não calculado",
    description: "Estimativa de impacto financeiro aguarda commit do run.",
  },
  auditoria: {
    title: "Auditoria vazia",
    description: "Trilha de auditoria disponível após importações confirmadas.",
  },
};

/**
 * Pré-visualização premium com vistas alternáveis (Sprint 22.9).
 */
export function PremiumPreviewTabs({
  activeRunId = null,
  activeRunLabel = null,
  className,
}: Props) {
  const [tab, setTab] = useState<PremiumPreviewTabId>("resumo");
  const hasRun = Boolean(activeRunId);
  const copy = TAB_EMPTY_COPY[tab];

  return (
    <section
      aria-label="Pré-visualização premium de importação"
      data-premium-preview
      className={cn(
        "rounded-xl border border-border/60 bg-card/40 p-4",
        gofMotion.fade,
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Pré-visualização Premium
          </h2>
          <p className="text-xs text-muted-foreground">
            {hasRun
              ? `Run: ${activeRunLabel ?? activeRunId}`
              : "Nenhum run ativo — estrutura pronta para dados reais."}
          </p>
        </div>
        {!hasRun ? (
          <span
            className="rounded-md border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
            data-premium-state="idle"
          >
            Aguardando run
          </span>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Vistas da pré-visualização"
        className="mb-4 flex gap-1 overflow-x-auto pb-1"
      >
        {PREMIUM_PREVIEW_TABS.map((t) => {
          const Icon = t.icon;
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`premium-panel-${t.id}`}
              id={`premium-tab-${t.id}`}
              disabled={!hasRun && t.id !== "resumo"}
              data-premium-tab={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "bg-[var(--brand-graphite)] text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`premium-panel-${tab}`}
        aria-labelledby={`premium-tab-${tab}`}
        tabIndex={0}
        className="min-h-[120px] rounded-lg border border-dashed border-border/60 bg-background/30 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {hasRun ? (
          <p className="text-sm text-muted-foreground">
            Vista <strong>{PREMIUM_PREVIEW_TABS.find((t) => t.id === tab)?.label}</strong>{" "}
            para run <code className="text-xs">{activeRunId}</code> — conteúdo detalhado
            disponível no histórico e revisão assistida.
          </p>
        ) : (
          <ExecutiveEmptyState
            title={copy.title}
            description={copy.description}
          />
        )}
      </div>
    </section>
  );
}
