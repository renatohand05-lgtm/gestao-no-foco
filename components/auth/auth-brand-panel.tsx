import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type AuthBrandPanelProps = {
  className?: string;
};

const highlights = [
  "Multiempresa e multiusuário",
  "Clientes, vendas e financeiro",
  "Feito para PMEs de qualquer segmento",
];

export function AuthBrandPanel({ className }: AuthBrandPanelProps) {
  return (
    <div
      className={cn(
        "relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <span className="text-sm font-bold">GF</span>
          </div>
          <span className="text-lg font-semibold">{siteConfig.name}</span>
        </Link>
      </div>

      <div className="relative space-y-6">
        <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tight">
          Gestão empresarial inteligente, no foco do que importa.
        </h1>
        <p className="max-w-md text-sm text-primary-foreground/80">
          {siteConfig.description}
        </p>
        <ul className="space-y-3 text-sm text-primary-foreground/90">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-white" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-primary-foreground/70">
        © {new Date().getFullYear()} {siteConfig.name}
      </p>
    </div>
  );
}
