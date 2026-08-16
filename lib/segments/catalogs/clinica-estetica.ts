import { defineLibrary } from "./builder.ts";
import type { SegmentLibraryItem } from "./types.ts";

export const CLINICA_ESTETICA_LIBRARY: SegmentLibraryItem[] = defineLibrary(
  "clinica_estetica",
  [
    {
      category: "Facial",
      defaultDurationMinutes: 60,
      recommendCount: 4,
      items: [
        "Limpeza de pele",
        "Limpeza de pele profunda",
        "Peeling",
        "Peeling químico",
        "Peeling de diamante",
        "Microdermoabrasão",
        "Hidratação facial",
        "Revitalização facial",
        "Drenagem facial",
        "Microagulhamento",
        "Radiofrequência facial",
        "LEDterapia",
      ],
    },
    {
      category: "Corporal",
      defaultDurationMinutes: 50,
      items: [
        "Drenagem linfática",
        "Massagem modeladora",
        "Massagem relaxante",
        "Radiofrequência corporal",
        "Ultrassom estético",
        {
          name: "Criolipólise",
          description: "Tratamento estético corporal quando aplicável à operação.",
          recommended: false,
        },
        "Endermoterapia",
        "Tratamento para celulite",
        "Tratamento para gordura localizada",
        "Tratamento para flacidez",
      ],
    },
    {
      category: "Depilação",
      defaultDurationMinutes: 30,
      items: [
        "Depilação facial",
        "Depilação axila",
        "Depilação pernas",
        "Depilação virilha",
        "Depilação a laser por área",
        { name: "Pacote de depilação", itemType: "combo" },
      ],
    },
    {
      category: "Sobrancelhas / Cílios",
      defaultDurationMinutes: 40,
      items: [
        "Design de sobrancelhas",
        "Henna",
        "Brow lamination",
        "Lash lifting",
        "Extensão de cílios",
        "Manutenção de cílios",
      ],
    },
    {
      category: "Massagens",
      defaultDurationMinutes: 50,
      items: [
        "Massagem relaxante",
        {
          name: "Massagem terapêutica não clínica",
          description: "Massagem de bem-estar. Sem prontuário ou diagnóstico clínico.",
        },
        "Drenagem",
        "Spa corporal",
      ],
    },
    {
      category: "Pacotes",
      defaultDurationMinutes: 50,
      recommended: true,
      defaultItemType: "combo",
      items: [
        "Pacote facial",
        "Pacote corporal",
        "Pacote drenagem",
        "Pacote depilação",
        "Pacote sessões",
        "Plano mensal",
      ],
    },
  ],
);
