/**
 * Sprint 30.7 — Labels multissetoriais (sem hardcodes espalhados).
 */

export type AutomationSegment =
  | "oficina"
  | "comercio"
  | "restaurante"
  | "servicos"
  | "consultoria"
  | "distribuicao"
  | "industria"
  | "generico";

const SEGMENT_COPY: Record<
  AutomationSegment,
  { title: string; highlights: string[] }
> = {
  oficina: {
    title: "Automações para oficina",
    highlights: [
      "OS atrasada",
      "Estoque mínimo de peças",
      "Follow-up de orçamento",
    ],
  },
  comercio: {
    title: "Automações para comércio",
    highlights: ["Estoque mínimo", "Meta abaixo", "Conta vencida"],
  },
  restaurante: {
    title: "Automações para restaurante",
    highlights: [
      "Item crítico",
      "Compra atrasada",
      "Meta abaixo",
      "Equipe sobrecarregada",
    ],
  },
  servicos: {
    title: "Automações para serviços",
    highlights: ["OS atrasada", "Cliente sem contato", "Proposta próxima"],
  },
  consultoria: {
    title: "Automações para consultoria",
    highlights: [
      "Proposta sem retorno",
      "Entrega atrasada",
      "Cliente sem contato",
      "Projeto em risco",
    ],
  },
  distribuicao: {
    title: "Automações para distribuição",
    highlights: ["Compra atrasada", "Estoque mínimo", "Lead time fornecedor"],
  },
  industria: {
    title: "Automações para indústria",
    highlights: ["Capacidade excedida", "Estoque mínimo", "Meta abaixo"],
  },
  generico: {
    title: "Central de Automações",
    highlights: [
      "Alertas internos",
      "Tarefas e aprovações",
      "Dry-run sem efeito externo",
    ],
  },
};

export function resolveAutomationSegment(
  segment: string | null | undefined,
): AutomationSegment {
  const s = (segment ?? "").toLowerCase();
  if (s.includes("oficina") || s.includes("mecan")) return "oficina";
  if (s.includes("restau") || s.includes("food")) return "restaurante";
  if (s.includes("consult")) return "consultoria";
  if (s.includes("distrib")) return "distribuicao";
  if (s.includes("indust")) return "industria";
  if (s.includes("comerc") || s.includes("varej")) return "comercio";
  if (s.includes("serv")) return "servicos";
  return "generico";
}

export function getAutomationSegmentCopy(segment: string | null | undefined) {
  return SEGMENT_COPY[resolveAutomationSegment(segment)];
}
