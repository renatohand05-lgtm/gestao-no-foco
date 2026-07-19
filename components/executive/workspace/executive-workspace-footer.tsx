"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useState } from "react";

import { DemoHide } from "@/components/demo/demo-hide";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exShadow, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type QuickLink = { href: string; label: string };

type SmartItem = {
  kind: "acao" | "risco" | "oportunidade";
  title: string;
  detail?: string;
};

type Props = {
  tenantSlug: string;
  updatedAtLabel: string;
  statusLabel: string;
  metaDiaria?: string;
  realizadoDia?: string;
  items: SmartItem[];
  panelDetails: {
    periodoLabel: string;
    filterChips: string[];
    observacao?: string;
    fontes: string;
    versao: string;
  };
};

const QUICK_LINKS: (tenant: string) => QuickLink[] = (tenantSlug) => [
  { href: `/${tenantSlug}/configuracoes/metas`, label: "Metas" },
  { href: `/${tenantSlug}/vendas`, label: "Vendas" },
  { href: `/${tenantSlug}/financeiro/dre`, label: "DRE" },
  {
    href: `/${tenantSlug}/ordens/qualidade-operacional`,
    label: "Qualidade",
  },
  { href: `/${tenantSlug}/relatorios`, label: "Relatórios" },
];

/**
 * Workspace inteligente — resumo útil; técnico em dialog (Sprint 12.4).
 */
export function ExecutiveWorkspaceFooter({
  tenantSlug,
  updatedAtLabel,
  statusLabel,
  metaDiaria,
  realizadoDia,
  items,
  panelDetails,
}: Props) {
  const [open, setOpen] = useState(false);
  const links = QUICK_LINKS(tenantSlug);

  return (
    <footer
      className={cn(
        "mt-2 rounded-2xl border border-slate-200/60 bg-white p-4 sm:p-5",
        exShadow.card,
        exAnimations.fade,
      )}
      aria-label="Workspace de decisão"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className={exTypography.sectionTitle}>Hoje</p>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10">
              {statusLabel}
            </span>
            <span className={exTypography.caption}>
              Sync {updatedAtLabel}
            </span>
          </div>

          {(metaDiaria || realizadoDia) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {metaDiaria ? (
                <p>
                  <span className={exTypography.label}>Meta do dia </span>
                  <span className="font-semibold tabular-nums">{metaDiaria}</span>
                </p>
              ) : null}
              {realizadoDia ? (
                <p>
                  <span className={exTypography.label}>Realizado </span>
                  <span className="font-semibold tabular-nums">
                    {realizadoDia}
                  </span>
                </p>
              ) : null}
            </div>
          )}

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((item) => (
              <li
                key={`${item.kind}-${item.title}`}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.03]"
              >
                <p className={exTypography.label}>
                  {item.kind === "acao"
                    ? "Ação"
                    : item.kind === "risco"
                      ? "Risco"
                      : "Oportunidade"}
                </p>
                <p className={cn(exTypography.cardTitle, "mt-0.5")}>
                  {item.title}
                </p>
                {item.detail ? (
                  <p className={cn(exTypography.caption, "mt-0.5 line-clamp-2")}>
                    {item.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <nav
            className="flex flex-wrap gap-1.5"
            aria-label="Links rápidos"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border border-slate-200/80 bg-white px-3 text-xs font-medium text-slate-700",
                  "hover:border-slate-300 dark:border-white/10 dark:bg-transparent dark:text-white/80",
                  exAnimations.focusRing,
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <DemoHide flag="footerTechPanel">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn("rounded-xl", exAnimations.focusRing)}
                  />
                }
              >
                <DsIcon icon={Info} size="sm" className="mr-1.5" />
                Informações do painel
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Informações do painel</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p>
                    <span className={exTypography.label}>Período </span>
                    {panelDetails.periodoLabel}
                  </p>
                  <div>
                    <p className={exTypography.label}>Filtros ativos</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {panelDetails.filterChips.map((chip) => (
                        <li key={chip}>{chip}</li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    <span className={exTypography.label}>Fontes </span>
                    {panelDetails.fontes}
                  </p>
                  {panelDetails.observacao ? (
                    <p>
                      <span className={exTypography.label}>Observação </span>
                      {panelDetails.observacao}
                    </p>
                  ) : null}
                  <p className={exTypography.caption}>
                    {panelDetails.versao} · Atualizado {updatedAtLabel}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </DemoHide>
        </div>
      </div>
    </footer>
  );
}
