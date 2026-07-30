"use client";

import { useState } from "react";
import {
  Briefcase,
  Building2,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const segments: Array<{
  id: string;
  icon: LucideIcon;
  title: string;
  focus: string;
  body: string;
}> = [
  {
    id: "oficinas",
    icon: Wrench,
    title: "Oficinas",
    focus: "OS · peças · entrega",
    body: "Ordens de serviço, estoque de peças e ritmo da oficina no mesmo cockpit.",
  },
  {
    id: "restaurantes",
    icon: UtensilsCrossed,
    title: "Restaurantes",
    focus: "Vendas · insumos · caixa",
    body: "Movimento diário, custos e previsibilidade de caixa para food service.",
  },
  {
    id: "comercio",
    icon: ShoppingBag,
    title: "Comércio",
    focus: "Estoque · margem · PDV",
    body: "Controle de estoque, margem e vendas com visão consolidada.",
  },
  {
    id: "consultorias",
    icon: Briefcase,
    title: "Consultorias",
    focus: "Projetos · faturamento",
    body: "Contratos, clientes e financeiro alinhados à operação de serviços.",
  },
  {
    id: "servicos",
    icon: Store,
    title: "Serviços",
    focus: "Agenda · CRM · OS",
    body: "Atendimento, retorno de clientes e operação sem perder o fio.",
  },
  {
    id: "pme",
    icon: Building2,
    title: "Pequenas e médias",
    focus: "Centro de comando",
    body: "Uma plataforma Enterprise adaptável — do balcão ao escritório.",
  },
];

/**
 * Segmentos com tabs refinadas (Sprint 25.5.2).
 */
export function SegmentsSection() {
  const [active, setActive] = useState(segments[0]!.id);
  const current = segments.find((s) => s.id === active) ?? segments[0]!;

  return (
    <section
      id="segmentos"
      data-landing-block="segments"
      className="relative border-b border-white/5 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-medium tracking-[0.18em] text-[var(--brand-gold)] uppercase">
            Segmentos
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Adaptada ao seu tipo de negócio
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Segmentos"
          className="mb-6 flex gap-2 overflow-x-auto pb-1"
        >
          {segments.map((s) => {
            const selected = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`seg-tab-${s.id}`}
                aria-controls={`seg-panel-${s.id}`}
                onClick={() => setActive(s.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  selected
                    ? "border-[var(--brand-gold)]/45 bg-[var(--brand-gold)]/15 text-[var(--brand-gold-soft)]"
                    : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white",
                )}
              >
                <s.icon className="size-4" aria-hidden />
                {s.title}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`seg-panel-${current.id}`}
          aria-labelledby={`seg-tab-${current.id}`}
          className="rounded-2xl border border-[var(--brand-gold)]/20 bg-[var(--brand-graphite)]/70 p-6 sm:p-8"
        >
          <p className="text-[10px] tracking-[0.16em] text-[var(--brand-gold)] uppercase">
            {current.focus}
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            {current.title}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            {current.body}
          </p>
        </div>
      </div>
    </section>
  );
}
