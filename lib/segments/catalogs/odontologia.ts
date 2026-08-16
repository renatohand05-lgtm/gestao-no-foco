import { defineLibrary } from "./builder.ts";
import type { SegmentLibraryItem } from "./types.ts";

export const CONSULTORIO_ODONTOLOGICO_LIBRARY: SegmentLibraryItem[] =
  defineLibrary("consultorio_odontologico", [
    {
      category: "Consultas",
      defaultDurationMinutes: 40,
      recommendCount: 4,
      items: [
        "Consulta inicial",
        "Avaliação",
        "Retorno",
        "Urgência",
        "Consulta preventiva",
      ],
    },
    {
      category: "Prevenção",
      defaultDurationMinutes: 50,
      items: [
        "Profilaxia / limpeza",
        "Aplicação de flúor",
        "Orientação de higiene",
        "Prevenção periódica",
      ],
    },
    {
      category: "Restauração",
      defaultDurationMinutes: 50,
      items: ["Restauração", "Troca de restauração", "Reconstrução dentária"],
    },
    {
      category: "Periodontia",
      defaultDurationMinutes: 50,
      items: [
        "Limpeza periodontal",
        "Raspagem",
        "Manutenção periodontal",
      ],
    },
    {
      category: "Endodontia",
      defaultDurationMinutes: 60,
      items: [
        "Avaliação endodôntica",
        "Tratamento de canal",
        {
          name: "Retratamento",
          description: "Retratamento endodôntico quando aplicável.",
          recommended: false,
        },
      ],
    },
    {
      category: "Cirurgia",
      defaultDurationMinutes: 45,
      items: [
        "Extração simples",
        {
          name: "Extração de terceiro molar",
          description: "Quando aplicável à operação do consultório.",
          recommended: false,
        },
        "Pequena cirurgia odontológica",
      ],
    },
    {
      category: "Prótese",
      defaultDurationMinutes: 60,
      items: [
        "Coroa",
        "Prótese parcial",
        "Prótese total",
        "Reparo de prótese",
        "Ajuste de prótese",
      ],
    },
    {
      category: "Estética",
      defaultDurationMinutes: 50,
      items: [
        "Clareamento",
        "Clareamento de consultório",
        "Clareamento supervisionado",
        {
          name: "Faceta",
          description: "Facetas quando aplicável à operação.",
          recommended: false,
        },
      ],
    },
    {
      category: "Ortodontia",
      defaultDurationMinutes: 40,
      items: [
        "Avaliação ortodôntica",
        "Manutenção ortodôntica",
        {
          name: "Instalação de aparelho",
          description: "Quando aplicável à operação do consultório.",
          recommended: false,
        },
      ],
    },
    {
      category: "Implantodontia",
      defaultDurationMinutes: 60,
      items: [
        "Avaliação para implante",
        "Implantação",
        "Manutenção de implante",
      ],
    },
  ]);
