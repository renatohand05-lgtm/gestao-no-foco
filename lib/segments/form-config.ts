/**
 * Sprint 35.1 — Configuração central de formulário de catálogo por segmento.
 * Páginas consomem isto; não espalhar `if (segment === …)`.
 */
import { PRODUTO_TIPO_OPTIONS } from "../produtos/constants.ts";
import type { ProdutoTipo } from "../../types/produtos.ts";
import type { ProductSegmentId, ResolvedSegmentContext } from "./types.ts";
import { librarySegmentForContext } from "./library-segment.ts";

export type CatalogFieldId =
  | "sku"
  | "codigo_barras"
  | "codigo_interno"
  | "ncm"
  | "cest"
  | "origem_mercadoria"
  | "peso_kg"
  | "dimensoes"
  | "altura_cm"
  | "largura_cm"
  | "comprimento_cm"
  | "marca"
  | "fabricante"
  | "estoque"
  | "lote"
  | "serie"
  | "validade"
  | "especialidade"
  | "equipe_ou_profissional"
  | "tempo_estimado_minutos"
  | "custo"
  | "custo_reposicao"
  | "preco_sugerido"
  | "veiculo"
  | "placa"
  | "km"
  | "combustivel"
  | "checklist"
  | "fotos"
  | "diagnostico_mecanico"
  | "pecas_mecanicas";

export type CatalogOperationType =
  | "work_order"
  | "appointment"
  | "attendance"
  | "consultation"
  | "procedure"
  | "checklist"
  | "photos";

export type CatalogItemTypeOption = {
  value: ProdutoTipo;
  label: string;
};

export type SegmentCatalogFormConfig = {
  segment: ProductSegmentId;
  allowedItemTypes: CatalogItemTypeOption[];
  allowedOperationTypes: CatalogOperationType[];
  visibleFields: CatalogFieldId[];
  hiddenFields: CatalogFieldId[];
  optionalFields: CatalogFieldId[];
  requiredFields: CatalogFieldId[];
  serviceLibrary: ProductSegmentId;
};

const OFICINA_ITEM_TYPES: CatalogItemTypeOption[] = [
  ...PRODUTO_TIPO_OPTIONS,
];

const PROFESSIONAL_HIDE: CatalogFieldId[] = [
  "especialidade",
  "veiculo",
  "placa",
  "km",
  "combustivel",
  "diagnostico_mecanico",
  "pecas_mecanicas",
];

const SERVICE_CATALOG_FIELDS: CatalogFieldId[] = [
  "codigo_interno",
  "tempo_estimado_minutos",
  "custo",
  "equipe_ou_profissional",
  "sku",
  "marca",
  "fabricante",
];

function configFor(segment: ProductSegmentId): SegmentCatalogFormConfig {
  switch (segment) {
    case "oficina":
      return {
        segment,
        allowedItemTypes: OFICINA_ITEM_TYPES,
        allowedOperationTypes: ["work_order", "checklist"],
        visibleFields: [
          "sku",
          "codigo_barras",
          "codigo_interno",
          "ncm",
          "cest",
          "origem_mercadoria",
          "peso_kg",
          "dimensoes",
          "marca",
          "fabricante",
          "estoque",
          "lote",
          "serie",
          "validade",
          "especialidade",
          "equipe_ou_profissional",
          "tempo_estimado_minutos",
          "custo",
          "custo_reposicao",
          "preco_sugerido",
          "veiculo",
          "placa",
          "km",
          "combustivel",
          "diagnostico_mecanico",
          "pecas_mecanicas",
        ],
        hiddenFields: [],
        optionalFields: ["km", "combustivel", "preco_sugerido", "custo"],
        requiredFields: [],
        serviceLibrary: "oficina",
      };
    case "barbearia":
      return {
        segment,
        allowedItemTypes: [
          { value: "servico", label: "Serviço" },
          { value: "produto", label: "Produto" },
          { value: "kit", label: "Kit" },
          { value: "combo", label: "Combo" },
        ],
        allowedOperationTypes: ["appointment"],
        visibleFields: SERVICE_CATALOG_FIELDS,
        hiddenFields: [
          ...PROFESSIONAL_HIDE,
          "ncm",
          "cest",
          "origem_mercadoria",
          "peso_kg",
          "dimensoes",
          "checklist",
        ],
        optionalFields: ["custo", "tempo_estimado_minutos"],
        requiredFields: [],
        serviceLibrary: "barbearia",
      };
    case "lava_rapido":
      return {
        segment,
        allowedItemTypes: [
          { value: "servico", label: "Serviço" },
          { value: "produto", label: "Produto" },
          { value: "materia_prima", label: "Insumo" },
          { value: "kit", label: "Kit" },
          { value: "combo", label: "Combo / Pacote" },
        ],
        allowedOperationTypes: ["attendance", "checklist", "photos"],
        visibleFields: [
          "codigo_interno",
          "tempo_estimado_minutos",
          "custo",
          "veiculo",
          "placa",
          "checklist",
          "fotos",
          "estoque",
        ],
        hiddenFields: [
          "especialidade",
          "diagnostico_mecanico",
          "pecas_mecanicas",
        ],
        optionalFields: ["km", "combustivel", "custo", "tempo_estimado_minutos"],
        requiredFields: [],
        serviceLibrary: "lava_rapido",
      };
    case "consultoria":
      return {
        segment,
        allowedItemTypes: [
          { value: "servico", label: "Serviço" },
          { value: "combo", label: "Pacote" },
        ],
        allowedOperationTypes: ["consultation"],
        visibleFields: [
          "codigo_interno",
          "tempo_estimado_minutos",
          "custo",
          "equipe_ou_profissional",
        ],
        hiddenFields: [
          ...PROFESSIONAL_HIDE,
          "sku",
          "codigo_barras",
          "ncm",
          "cest",
          "origem_mercadoria",
          "peso_kg",
          "dimensoes",
          "estoque",
          "lote",
          "serie",
          "marca",
          "fabricante",
          "checklist",
        ],
        optionalFields: ["custo", "tempo_estimado_minutos"],
        requiredFields: [],
        serviceLibrary: "consultoria",
      };
    case "clinica_estetica":
      return {
        segment,
        allowedItemTypes: [
          { value: "servico", label: "Procedimento / Serviço" },
          { value: "produto", label: "Produto" },
          { value: "materia_prima", label: "Insumo" },
          { value: "combo", label: "Pacote" },
          { value: "kit", label: "Kit" },
        ],
        allowedOperationTypes: ["procedure", "appointment"],
        visibleFields: SERVICE_CATALOG_FIELDS,
        hiddenFields: [
          ...PROFESSIONAL_HIDE,
          "ncm",
          "cest",
          "peso_kg",
          "dimensoes",
          "checklist",
        ],
        optionalFields: ["custo", "tempo_estimado_minutos"],
        requiredFields: [],
        serviceLibrary: "clinica_estetica",
      };
    case "consultorio_odontologico":
      return {
        segment,
        allowedItemTypes: [
          { value: "servico", label: "Procedimento / Serviço" },
          { value: "produto", label: "Produto" },
          { value: "materia_prima", label: "Material / Insumo" },
        ],
        allowedOperationTypes: ["consultation", "procedure"],
        visibleFields: SERVICE_CATALOG_FIELDS,
        hiddenFields: [
          ...PROFESSIONAL_HIDE,
          "ncm",
          "cest",
          "peso_kg",
          "dimensoes",
          "checklist",
        ],
        optionalFields: ["custo", "tempo_estimado_minutos"],
        requiredFields: [],
        serviceLibrary: "consultorio_odontologico",
      };
    case "restaurante":
      return {
        segment,
        allowedItemTypes: [
          { value: "produto", label: "Item do cardápio" },
          { value: "materia_prima", label: "Insumo" },
          { value: "combo", label: "Combo" },
        ],
        allowedOperationTypes: ["work_order", "attendance"],
        visibleFields: [
          "codigo_interno",
          "tempo_estimado_minutos",
          "custo",
          "estoque",
        ],
        hiddenFields: [
          ...PROFESSIONAL_HIDE,
          "ncm",
          "cest",
          "peso_kg",
          "dimensoes",
          "checklist",
          "fotos",
        ],
        optionalFields: ["custo", "tempo_estimado_minutos"],
        requiredFields: [],
        serviceLibrary: "restaurante",
      };
  }
}

export function getSegmentFormConfig(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): SegmentCatalogFormConfig {
  return configFor(librarySegmentForContext(ctx));
}

export function isCatalogFieldHidden(
  config: SegmentCatalogFormConfig,
  field: CatalogFieldId,
): boolean {
  return config.hiddenFields.includes(field);
}

export function isCatalogFieldVisible(
  config: SegmentCatalogFormConfig,
  field: CatalogFieldId,
): boolean {
  if (isCatalogFieldHidden(config, field)) return false;
  if (config.visibleFields.length === 0) return true;
  const operational: CatalogFieldId[] = [
    "veiculo",
    "placa",
    "km",
    "combustivel",
    "checklist",
    "fotos",
    "diagnostico_mecanico",
    "pecas_mecanicas",
  ];
  if (operational.includes(field)) {
    return config.visibleFields.includes(field);
  }
  return true;
}

export function itemTypeOptionsForForm(
  config: SegmentCatalogFormConfig,
  currentTipo?: ProdutoTipo,
): CatalogItemTypeOption[] {
  const options = [...config.allowedItemTypes];
  if (currentTipo && !options.some((o) => o.value === currentTipo)) {
    const fallback = PRODUTO_TIPO_OPTIONS.find((o) => o.value === currentTipo);
    options.push(fallback ?? { value: currentTipo, label: currentTipo });
  }
  return options;
}
