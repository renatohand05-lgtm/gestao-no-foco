"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarClock,
  Car,
  Droplets,
  Factory,
  Store,
  Truck,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  listProductOnboardingSegments,
  searchEnterpriseSegments,
  type EnterpriseSegmentId,
} from "@/config/onboarding/segments";
import { DsIcon } from "@/components/ui/ds-icon";
import { Input } from "@/components/ui/input";
import { gofFocusRing, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Wrench,
  Car,
  Droplets,
  Store,
  UtensilsCrossed,
  CalendarClock,
  Briefcase,
  Truck,
  Factory,
  Building2,
};

type Props = {
  value: EnterpriseSegmentId | null;
  onChange: (id: EnterpriseSegmentId) => void;
};

export function SegmentPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const segments = useMemo(() => {
    const q = query.trim();
    if (q) return searchEnterpriseSegments(q);
    return listProductOnboardingSegments();
  }, [query]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="segment-search" className={gofTypography.caption}>
          Pesquisar segmento
        </label>
        <Input
          id="segment-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: oficina, barbearia, consultoria…"
          className={cn("mt-1 min-h-11", gofFocusRing)}
          autoComplete="off"
        />
      </div>

      <div
        className="grid gap-2 sm:grid-cols-2"
        role="listbox"
        aria-label="Segmentos disponíveis"
      >
        {segments.map((seg) => {
          const Icon = ICON_MAP[seg.icon] ?? Building2;
          const selected = value === seg.id;
          return (
            <button
              key={seg.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(seg.id)}
              className={cn(
                "flex min-h-11 items-start gap-3 border px-3 py-3 text-left motion-safe:transition-colors",
                gofRadius.lg,
                gofFocusRing,
                selected
                  ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10"
                  : "border-border/60 bg-card hover:border-border",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center border border-border/50 bg-muted/40",
                  gofRadius.md,
                )}
              >
                <DsIcon icon={Icon} size="sm" />
              </span>
              <span>
                <span className="block text-sm font-medium">{seg.label}</span>
                <span className={cn("mt-0.5 block", gofTypography.caption)}>
                  {seg.shortDescription}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {segments.length === 0 ? (
        <p className={gofTypography.caption} role="status">
          Nenhum segmento encontrado para “{query}”.
        </p>
      ) : !query.trim() ? (
        <p className={gofTypography.caption}>
          Os 6 tipos de negócio da fundação. Pesquise para ver outras opções.
        </p>
      ) : null}
    </div>
  );
}
