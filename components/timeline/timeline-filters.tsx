"use client";

import { Input } from "@/components/ui/input";
import type { TimelineFilters } from "@/lib/timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  value: TimelineFilters;
  className?: string;
  onChange?: (next: TimelineFilters) => void;
};

export function TimelineFiltersBar({ value, className, onChange }: Props) {
  return (
    <div
      data-timeline-filters
      className={cn("flex flex-wrap gap-2", className)}
    >
      <p className={cn(gofTypography.caption, "w-full")}>Filtros</p>
      <Input
        placeholder="Módulo"
        className="max-w-[140px]"
        value={value.module ?? ""}
        onChange={(e) =>
          onChange?.({ ...value, module: e.target.value || null })
        }
      />
      <Input
        placeholder="Categoria"
        className="max-w-[140px]"
        value={value.category ?? ""}
        onChange={(e) =>
          onChange?.({ ...value, category: e.target.value || null })
        }
      />
      <Input
        placeholder="Origem"
        className="max-w-[140px]"
        value={value.source ?? ""}
        onChange={(e) =>
          onChange?.({ ...value, source: e.target.value || null })
        }
      />
      <Input
        placeholder="Status"
        className="max-w-[140px]"
        value={value.status ?? ""}
        onChange={(e) =>
          onChange?.({ ...value, status: e.target.value || null })
        }
      />
      <Input
        placeholder="Severidade"
        className="max-w-[140px]"
        value={value.severity ?? ""}
        onChange={(e) =>
          onChange?.({ ...value, severity: e.target.value || null })
        }
      />
      <Input
        type="date"
        className="max-w-[160px]"
        value={value.dateFrom?.slice(0, 10) ?? ""}
        onChange={(e) =>
          onChange?.({
            ...value,
            dateFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
          })
        }
      />
      <Input
        type="date"
        className="max-w-[160px]"
        value={value.dateTo?.slice(0, 10) ?? ""}
        onChange={(e) =>
          onChange?.({
            ...value,
            dateTo: e.target.value ? `${e.target.value}T23:59:59.999Z` : null,
          })
        }
      />
    </div>
  );
}
