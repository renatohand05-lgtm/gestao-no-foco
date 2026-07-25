"use client";

import {
  EXECUTIVE_TIMELINE_CATEGORY_LABEL,
  type ExecutiveTimelineCategory,
  type ExecutiveTimelineSort,
} from "@/lib/executive-timeline";
import { gofFocusRing, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: ExecutiveTimelineSort; label: string }[] = [
  { value: "recent", label: "Mais recente" },
  { value: "impact", label: "Maior impacto" },
  { value: "risk", label: "Maior risco" },
  { value: "confidence", label: "Maior confiança" },
];

const CATEGORIES = Object.keys(
  EXECUTIVE_TIMELINE_CATEGORY_LABEL,
) as ExecutiveTimelineCategory[];

type Props = {
  sort: ExecutiveTimelineSort;
  onSortChange: (sort: ExecutiveTimelineSort) => void;
  categories: ExecutiveTimelineCategory[];
  onCategoriesChange: (cats: ExecutiveTimelineCategory[]) => void;
  className?: string;
};

export function ExecutiveTimelineFilter({
  sort,
  onSortChange,
  categories,
  onCategoriesChange,
  className,
}: Props) {
  function toggle(cat: ExecutiveTimelineCategory) {
    if (categories.includes(cat)) {
      onCategoriesChange(categories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...categories, cat]);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className={gofTypography.caption}>Ordenar</span>
          <select
            className={cn(
              "h-9 rounded-lg border border-border bg-background px-2.5 text-xs",
              gofFocusRing,
            )}
            value={sort}
            onChange={(e) =>
              onSortChange(e.target.value as ExecutiveTimelineSort)
            }
            aria-label="Ordenação da timeline"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={cn(
            "h-9 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted/50",
            gofFocusRing,
          )}
          onClick={() => onCategoriesChange([])}
        >
          Limpar filtros
        </button>
      </div>

      <div>
        <p className={cn(gofTypography.caption, "mb-1.5")}>Categorias</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Filtro por categoria">
          {CATEGORIES.map((cat) => {
            const active = categories.length === 0 || categories.includes(cat);
            return (
              <li key={cat}>
                <button
                  type="button"
                  aria-pressed={categories.includes(cat)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-medium",
                    gofFocusRing,
                    active && categories.length > 0
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40",
                  )}
                  onClick={() => toggle(cat)}
                >
                  {EXECUTIVE_TIMELINE_CATEGORY_LABEL[cat]}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
