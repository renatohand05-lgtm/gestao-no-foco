/**
 * Sprint 30.3 — Catálogo enterprise de segmentos (fonte única).
 * Sem path alias — seguro para testes Node.
 */

export type EnterpriseSegmentId =
  | "oficina"
  | "auto_center"
  | "lava_rapido"
  | "comercio"
  | "restaurante"
  | "servicos"
  | "consultoria"
  | "distribuicao"
  | "pequena_industria"
  | "outro";

/** Segmento de navegação canônico (Sprint 30.1). */
export type NavSegmentId =
  | "oficina"
  | "restaurante"
  | "comercio"
  | "consultoria"
  | "servicos"
  | "outro";

export type EnterpriseSegmentDef = {
  id: EnterpriseSegmentId;
  label: string;
  shortDescription: string;
  /** Lucide icon name key used by UI mapping */
  icon: string;
  searchTerms: string[];
  /** Mapeia para labels/nav da Sprint 30.1 */
  navSegment: NavSegmentId;
};

export const ENTERPRISE_SEGMENTS: readonly EnterpriseSegmentDef[] = [
  {
    id: "oficina",
    label: "Oficina Mecânica",
    shortDescription: "OS, veículos, mecânicos e peças",
    icon: "Wrench",
    searchTerms: ["oficina", "mecanica", "carro", "os", "veiculo"],
    navSegment: "oficina",
  },
  {
    id: "auto_center",
    label: "Auto Center",
    shortDescription: "Serviços automotivos, pneus e alinhamento",
    icon: "Car",
    searchTerms: ["auto", "center", "pneu", "alinhamento"],
    navSegment: "oficina",
  },
  {
    id: "lava_rapido",
    label: "Lava Rápido",
    shortDescription: "Lavagem, estética e agenda de boxes",
    icon: "Droplets",
    searchTerms: ["lava", "lavagem", "estetica", "box"],
    navSegment: "servicos",
  },
  {
    id: "comercio",
    label: "Comércio",
    shortDescription: "Produtos, pedidos, caixa e clientes",
    icon: "Store",
    searchTerms: ["comercio", "loja", "varejo", "pdv"],
    navSegment: "comercio",
  },
  {
    id: "restaurante",
    label: "Restaurante",
    shortDescription: "Cardápio, salão, cozinha e delivery",
    icon: "UtensilsCrossed",
    searchTerms: ["restaurante", "food", "salao", "cozinha"],
    navSegment: "restaurante",
  },
  {
    id: "servicos",
    label: "Serviços",
    shortDescription: "Agenda, ordens e profissionais",
    icon: "CalendarClock",
    searchTerms: ["servicos", "prestador", "agenda"],
    navSegment: "servicos",
  },
  {
    id: "consultoria",
    label: "Consultoria",
    shortDescription: "Projetos, contratos e horas",
    icon: "Briefcase",
    searchTerms: ["consultoria", "projeto", "horas"],
    navSegment: "consultoria",
  },
  {
    id: "distribuicao",
    label: "Distribuição",
    shortDescription: "Estoque, pedidos e rotas B2B",
    icon: "Truck",
    searchTerms: ["distribuicao", "atacado", "logistica"],
    navSegment: "comercio",
  },
  {
    id: "pequena_industria",
    label: "Pequena Indústria",
    shortDescription: "Produção, insumos e ordens internas",
    icon: "Factory",
    searchTerms: ["industria", "producao", "fabrica"],
    navSegment: "comercio",
  },
  {
    id: "outro",
    label: "Outro",
    shortDescription: "Configuração genérica adaptável",
    icon: "Building2",
    searchTerms: ["outro", "geral", "empresa"],
    navSegment: "outro",
  },
] as const;

const BY_ID: Record<EnterpriseSegmentId, EnterpriseSegmentDef> =
  Object.fromEntries(ENTERPRISE_SEGMENTS.map((s) => [s.id, s])) as Record<
    EnterpriseSegmentId,
    EnterpriseSegmentDef
  >;

export function isEnterpriseSegmentId(
  value: string | null | undefined,
): value is EnterpriseSegmentId {
  if (!value) return false;
  return Object.prototype.hasOwnProperty.call(BY_ID, value);
}

export function getEnterpriseSegment(
  id: string | null | undefined,
): EnterpriseSegmentDef {
  if (id && isEnterpriseSegmentId(id)) return BY_ID[id];
  return BY_ID.outro;
}

export function toNavSegmentId(
  segment: string | null | undefined,
): NavSegmentId {
  return getEnterpriseSegment(segment).navSegment;
}

export function searchEnterpriseSegments(
  query: string,
): readonly EnterpriseSegmentDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return ENTERPRISE_SEGMENTS;
  return ENTERPRISE_SEGMENTS.filter((s) => {
    const hay = [s.label, s.shortDescription, s.id, ...s.searchTerms]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
