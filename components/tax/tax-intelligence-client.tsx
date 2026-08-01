"use client";

import { useState, useTransition } from "react";
import { askTaxIntelligenceAction } from "@/lib/tax/actions";
import type { TaxIntelligenceIntent } from "@/lib/tax/types";
import { GFButton } from "@/components/gf/gf-button";
import { gfType } from "@/lib/design-system/signature";

const QUESTIONS: Array<{ q: string; intent: TaxIntelligenceIntent }> = [
  { q: "Explique minha carga tributária.", intent: "explain_tax_burden" },
  {
    q: "Quais são meus principais riscos tributários?",
    intent: "identify_tax_risks",
  },
  {
    q: "Quais regras estão próximas do fim da vigência?",
    intent: "identify_tax_risks",
  },
  {
    q: "Tenho obrigações próximas?",
    intent: "summarize_tax_obligations",
  },
  {
    q: "Compare os cenários tributários.",
    intent: "compare_tax_scenarios",
  },
  {
    q: "Qual o impacto tributário no caixa?",
    intent: "forecast_tax_cash_impact",
  },
  {
    q: "Quais cadastros fiscais estão incompletos?",
    intent: "identify_tax_risks",
  },
];

export function TaxIntelligenceClient({
  tenantSlug,
  evidence,
}: {
  tenantSlug: string;
  evidence: string[];
}) {
  const [pending, start] = useTransition();
  const [answer, setAnswer] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  return (
    <div className="space-y-3" data-tax-intelligence-client="">
      <div className="flex flex-wrap gap-2">
        {QUESTIONS.map((item) => (
          <GFButton
            key={item.q}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await askTaxIntelligenceAction({
                  tenantSlug,
                  intent: item.intent,
                  evidence,
                  burdenDeltaPct:
                    item.intent === "explain_tax_burden" ||
                    item.intent === "explain_tax_change"
                      ? evidence.length
                        ? 5
                        : null
                      : null,
                });
                setAnswer(res.answer);
                setMeta(
                  `confiança ${res.confidence} · evidências ${res.evidence.length} · ${res.limitations.join("; ")}`,
                );
              })
            }
          >
            {item.q}
          </GFButton>
        ))}
      </div>
      {answer ? (
        <div data-tax-intelligence-answer="" className="space-y-1 rounded-xl border border-[var(--gf-border-subtle)] p-3">
          <p className={gfType.body}>{answer}</p>
          <p className={gfType.caption}>{meta}</p>
        </div>
      ) : null}
    </div>
  );
}
