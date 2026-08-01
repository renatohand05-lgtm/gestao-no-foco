import Link from "next/link";

const LINKS = [
  { path: "", label: "Hub" },
  { path: "/regras", label: "Regras" },
  { path: "/versoes", label: "Versões" },
  { path: "/obrigacoes", label: "Obrigações" },
  { path: "/simulador", label: "Simulador" },
  { path: "/executivo", label: "Executivo" },
  { path: "/auditoria", label: "Auditoria" },
  { path: "/configuracoes", label: "Configurações" },
] as const;

export function TributarioHubNav({ tenantSlug }: { tenantSlug: string }) {
  return (
    <nav
      data-tributario-hub-nav=""
      className="flex flex-wrap gap-2 text-xs"
      aria-label="Tributário"
    >
      {LINKS.map((l) => (
        <Link
          key={l.path || "hub"}
          href={`/${tenantSlug}/tributario${l.path}`}
          className="rounded-lg border border-[var(--gf-border-subtle)] px-2.5 py-1 hover:border-[var(--gf-border-active)]"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
