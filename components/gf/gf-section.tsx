import { cn } from "@/lib/utils";
import { gfSpace, gfSurface, gfType } from "@/lib/design-system/signature";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  surface?: "raised" | "elevated" | "intelligence";
};

export function GFSection({
  title,
  description,
  actions,
  children,
  className,
  surface = "raised",
}: Props) {
  return (
    <section
      className={cn(
        "gf-section rounded-[var(--gf-radius)] p-4",
        surface === "raised" && gfSurface.raised,
        surface === "elevated" && gfSurface.elevated,
        surface === "intelligence" && gfSurface.intelligence,
        gfSpace.stackBlock,
        className,
      )}
      data-gf-section=""
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 className={gfType.sectionTitle}>{title}</h2>
          {description ? <p className={gfType.caption}>{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
