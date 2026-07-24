import {
  ExecutiveBadge,
  type ExecutiveBadgeTone,
  type ExecutiveBadgeVariant,
} from "@/components/executive/ExecutiveBadge";
import {
  SITUACAO_LABEL,
  type SituacaoDia,
} from "@/lib/dashboard/resumo-vendas-mes";
import { cn } from "@/lib/utils";

const SITUACAO_TONE: Record<
  SituacaoDia,
  { tone: ExecutiveBadgeTone; variant: ExecutiveBadgeVariant }
> = {
  muito_abaixo: { tone: "danger", variant: "soft" },
  abaixo: { tone: "warning", variant: "soft" },
  atencao: { tone: "warning", variant: "outline" },
  atingida: { tone: "success", variant: "soft" },
  superou: { tone: "success", variant: "solid" },
  futuro: { tone: "neutral", variant: "soft" },
  neutro: { tone: "neutral", variant: "soft" },
};

/**
 * Badge de situação do resumo diário — ExecutiveBadge oficial (Gate 19.6).
 */
export function SituacaoBadge({
  situacao,
  className,
}: {
  situacao: SituacaoDia;
  className?: string;
}) {
  const mapped = SITUACAO_TONE[situacao];
  return (
    <span aria-label={`Situação: ${SITUACAO_LABEL[situacao]}`}>
      <ExecutiveBadge
        tone={mapped.tone}
        variant={mapped.variant}
        className={cn("whitespace-nowrap", className)}
      >
        {SITUACAO_LABEL[situacao]}
      </ExecutiveBadge>
    </span>
  );
}
