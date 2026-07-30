import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Botões padronizados — raio, padding e hover consistentes (Sprint 13.2). */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-graphite)] text-white hover:bg-[var(--brand-graphite)]/90 shadow-[0_0_0_1px_rgb(201_168_76_/0.08)] dark:bg-[var(--brand-gold)] dark:text-[var(--brand-navy)] dark:hover:bg-[var(--brand-gold-soft)] dark:shadow-[0_0_24px_rgb(201_168_76_/0.18)]",
        outline:
          "border-[var(--brand-gray-dark)]/20 bg-white text-foreground hover:bg-[var(--brand-gray-light)] aria-expanded:bg-[var(--brand-gray-light)] dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5",
        secondary:
          "bg-[var(--brand-gray-light)] text-[var(--brand-graphite)] hover:bg-[var(--brand-gray-dark)]/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
        ghost:
          "text-[var(--brand-gray-dark)] hover:bg-[var(--brand-gray-light)] hover:text-[var(--brand-graphite)] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        success:
          "bg-success/15 text-success hover:bg-success/25 focus-visible:ring-success/30 dark:bg-success/20 dark:text-success",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-2 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[0.8125rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-9",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      nativeButton={nativeButton ?? (render == null)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
