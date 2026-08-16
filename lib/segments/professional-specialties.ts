export const BARBER_SPECIALTY_SUGGESTIONS = [
  "Corte masculino",
  "Barba",
  "Corte e barba",
  "Fade / degradê",
  "Navalha",
  "Química / coloração",
  "Pigmentação",
  "Terapia capilar",
  "Visagismo",
  "Atendimento infantil",
  "Geral",
] as const;

export function specialtySuggestionsForSegment(
  segment: string | null,
): string[] {
  if (segment === "barbearia") return [...BARBER_SPECIALTY_SUGGESTIONS];
  return [];
}
