import { ExecutiveBadge } from "@/components/executive";
import type { ExColorTone } from "@/lib/design-system/colors";
import type { MetaVendasStatus } from "@/types/metas-vendas";

export type ComercialStatusPresentation = {
  label: "Excelente" | "Atenção" | "Abaixo" | "Crítico";
  tone: Exclude<ExColorTone, "neutral">;
};

/**
 * Mapeamento visual (apresentação) de MetaVendasStatus → 4 labels executivos.
 * Não altera regras de negócio nem META_STATUS_LABEL.
 */
export function mapComercialStatusPresentation(
  status: MetaVendasStatus,
): ComercialStatusPresentation {
  switch (status) {
    case "atingida":
    case "acima_do_ritmo":
      return { label: "Excelente", tone: "success" };
    case "no_ritmo":
    case "mes_encerrado":
      return { label: "Atenção", tone: "warning" };
    case "abaixo_do_ritmo":
      return { label: "Abaixo", tone: "warning" };
    case "sem_meta":
      return { label: "Abaixo", tone: "info" };
    case "muito_abaixo_do_ritmo":
      return { label: "Crítico", tone: "danger" };
  }
}

type Props = {
  status: MetaVendasStatus;
  className?: string;
};

export function ComercialStatusBadge({ status, className }: Props) {
  const { label, tone } = mapComercialStatusPresentation(status);
  return (
    <ExecutiveBadge tone={tone} className={className}>
      {label}
    </ExecutiveBadge>
  );
}
