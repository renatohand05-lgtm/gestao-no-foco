import { ExecutiveCard, ExecutiveSection } from "@/components/executive";
import { exAnimations, exStack, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CommercialPanelData } from "@/types/commercial-panel";

type Props = {
  data: CommercialPanelData;
};

export function ComercialChannelSection({ data }: Props) {
  return (
    <div className={exStack[16]}>
      <ExecutiveSection title="Por canal">
        <ExecutiveCard padding={20} className={exAnimations.fade}>
          <div className="flex min-h-[5rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center">
            <p className={cn(exTypography.caption, "max-w-lg")}>
              O modelo de vendas ainda não possui campo de canal/origem
              {data.auditoria.tem_canal ? "" : " (auditoria: tem_canal=false)"}
              . A tabela fica preparada e vazia até existir estrutura aprovada —
              sem mock e sem migration nesta sprint.
            </p>
          </div>
        </ExecutiveCard>
      </ExecutiveSection>

      <ExecutiveSection title="Share dos últimos 13 meses">
        <ExecutiveCard padding={20} className={exAnimations.fade}>
          <div className="flex min-h-[5rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center">
            <p className={cn(exTypography.caption, "max-w-lg")}>
              Indisponível sem dimensão de canal
              {data.share_modo === "indisponivel"
                ? " (share_modo=indisponivel)"
                : ""}
              . Quando o canal existir, este gráfico exibirá a participação mensal
              por canal (mês atual + 12 anteriores).
            </p>
          </div>
        </ExecutiveCard>
      </ExecutiveSection>
    </div>
  );
}
