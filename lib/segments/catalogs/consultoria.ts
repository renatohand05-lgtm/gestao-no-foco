import { defineLibrary } from "./builder.ts";
import type { SegmentLibraryItem } from "./types.ts";

export const CONSULTORIA_LIBRARY: SegmentLibraryItem[] = defineLibrary(
  "consultoria",
  [
    {
      category: "Consultoria",
      defaultDurationMinutes: 90,
      recommendCount: 4,
      items: [
        "Consultoria inicial",
        "Consultoria estratégica",
        "Consultoria empresarial",
        "Consultoria financeira",
        "Consultoria comercial",
        "Consultoria operacional",
        "Consultoria de processos",
        "Consultoria de gestão",
        "Consultoria de marketing",
        "Consultoria de RH",
        "Consultoria tecnológica",
      ],
    },
    {
      category: "Diagnóstico",
      defaultDurationMinutes: 120,
      items: [
        "Diagnóstico empresarial",
        "Diagnóstico financeiro",
        "Diagnóstico comercial",
        "Diagnóstico operacional",
        "Diagnóstico de processos",
      ],
    },
    {
      category: "Projetos",
      defaultDurationMinutes: 120,
      items: [
        "Projeto de melhoria",
        "Projeto de implantação",
        "Projeto estratégico",
        "Planejamento empresarial",
        "Planejamento financeiro",
        "Planejamento comercial",
        "Estruturação de processos",
      ],
    },
    {
      category: "Assessoria",
      defaultDurationMinutes: 60,
      recommended: true,
      items: [
        "Assessoria mensal",
        "Assessoria executiva",
        "Assessoria financeira",
        "Assessoria comercial",
        "Assessoria administrativa",
      ],
    },
    {
      category: "Treinamentos",
      defaultDurationMinutes: 120,
      items: [
        "Treinamento individual",
        "Treinamento de equipe",
        "Workshop",
        "Mentoria",
        "Capacitação gerencial",
        "Palestra",
      ],
    },
    {
      category: "Recorrência",
      defaultDurationMinutes: 60,
      recommended: true,
      items: [
        "Acompanhamento mensal",
        "Reunião de acompanhamento",
        "Consultoria recorrente",
        "Suporte especializado",
        { name: "Retainer mensal", itemType: "combo" },
      ],
    },
    {
      category: "Outros",
      defaultDurationMinutes: 60,
      defaultUnit: "HR",
      items: [
        "Auditoria",
        "Análise",
        "Relatório técnico",
        "Pesquisa",
        "Visita técnica",
        "Reunião estratégica",
        {
          name: "Hora técnica",
          suggestedUnit: "HR",
          defaultDurationMinutes: 60,
          recommended: true,
          description: "Cobrança por hora técnica. Informe seu preço.",
        },
      ],
    },
  ],
);
