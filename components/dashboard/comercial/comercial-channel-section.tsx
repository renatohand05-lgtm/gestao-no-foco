import { ExecutiveCard, ExecutiveSection } from "@/components/executive";
import { exAnimations, exStack, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CommercialPanelData } from "@/types/commercial-panel";

type Props = {
  data: CommercialPanelData;
};

export function ComercialChannelSection(_props: Props) {
  return (
    <div className={exStack[16]}>
      <ExecutiveSection title="Por canal">
        <ExecutiveCard padding={20} className={exAnimations.fade}>
          <div className="flex min-h-[5rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center">
            <p className={cn(exTypography.caption, "max-w-lg")}>
              A dimensão de canal/origem ainda não está disponível nas vendas.
              Quando estiver habilitada, este painel mostrará a distribuição real
              por canal — sem inventar números.
            </p>
          </div>
        </ExecutiveCard>
      </ExecutiveSection>

      <ExecutiveSection title="Share dos últimos 13 meses">
        <ExecutiveCard padding={20} className={exAnimations.fade}>
          <div className="flex min-h-[5rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center">
            <p className={cn(exTypography.caption, "max-w-lg")}>
              Indisponível enquanto não houver canal nas vendas. Assim que a
              estrutura existir, o gráfico exibirá a participação mensal por canal
              (mês atual + 12 anteriores).
            </p>
          </div>
        </ExecutiveCard>
      </ExecutiveSection>
    </div>
  );
}
