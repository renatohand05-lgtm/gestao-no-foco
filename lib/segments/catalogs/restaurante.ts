import { defineLibrary } from "./builder.ts";
import type { SegmentLibraryItem } from "./types.ts";

export const RESTAURANTE_LIBRARY: SegmentLibraryItem[] = defineLibrary(
  "restaurante",
  [
    {
      category: "Entradas",
      defaultDurationMinutes: 15,
      items: [
        "Pão de alho",
        "Bolinho de bacalhau",
        "Isca de frango",
        "Bruschetta",
        "Carpaccio",
        "Salada da casa",
      ],
    },
    {
      category: "Pratos principais",
      defaultDurationMinutes: 30,
      recommendCount: 6,
      items: [
        "Filé à parmegiana",
        "Frango grelhado",
        "Picanha na chapa",
        "Massa ao molho branco",
        "Feijoada",
        "Peixe grelhado",
        "Risoto",
        "Prato executivo",
      ],
    },
    {
      category: "Porções",
      defaultDurationMinutes: 20,
      items: [
        "Batata frita",
        "Polenta frita",
        "Anéis de cebola",
        "Frango a passarinho",
        "Calabresa acebolada",
      ],
    },
    {
      category: "Bebidas",
      defaultDurationMinutes: 5,
      defaultUnit: "unidade",
      items: [
        "Refrigerante lata",
        "Suco natural",
        "Água mineral",
        "Água com gás",
        "Cerveja long neck",
        "Chopp",
        "Caipirinha",
        "Vinho taça",
      ],
    },
    {
      category: "Sobremesas",
      defaultDurationMinutes: 10,
      items: [
        "Pudim",
        "Petit gateau",
        "Sorvete",
        "Mousse de maracujá",
        "Torta do dia",
      ],
    },
    {
      category: "Combos",
      defaultDurationMinutes: 30,
      recommended: true,
      defaultItemType: "combo",
      items: [
        "Combo executivo",
        "Combo casal",
        "Combo família",
        "Combo delivery",
      ],
    },
  ],
);
