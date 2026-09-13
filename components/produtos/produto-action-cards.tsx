import Link from "next/link";
import { FileUp, Package, Wrench } from "lucide-react";

type Props = {
  tenantSlug: string;
};

/**
 * Substitui os 4 botões de ação (Importar produtos, Importar serviços,
 * Novo produto, Novo serviço) por 3 cards com ícone + descrição — mais
 * convidativo e intuitivo pra quem nunca usou o sistema.
 */
export function ProdutoActionCards({ tenantSlug }: Props) {
  const cards = [
    {
      href: `/${tenantSlug}/produtos/novo?tipo=produto`,
      icon: Package,
      title: "Cadastrar produto",
      description: "Item físico, com controle de estoque",
      featured: true,
    },
    {
      href: `/${tenantSlug}/produtos/novo?tipo=servico`,
      icon: Wrench,
      title: "Cadastrar serviço",
      description: "Mão de obra, sem controle de estoque",
      featured: false,
    },
    {
      href: `/${tenantSlug}/produtos/importar`,
      icon: FileUp,
      title: "Importar em massa",
      description: "Traga tudo de uma planilha só",
      featured: false,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={`group rounded-xl border p-4 transition ${
            card.featured
              ? "border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/[0.07] hover:border-[var(--brand-gold)]"
              : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
          }`}
        >
          <card.icon
            className={`size-6 ${
              card.featured
                ? "text-[var(--brand-gold)]"
                : "text-muted-foreground group-hover:text-foreground"
            }`}
            aria-hidden
          />
          <p className="mt-2.5 text-sm font-semibold text-foreground">
            {card.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {card.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
