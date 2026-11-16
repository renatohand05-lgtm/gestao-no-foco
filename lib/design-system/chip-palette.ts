/**
 * Paleta de "chips" de ícone do visual Gestão Aurora (demo v5).
 * Só apresentação — gradiente por módulo e cor por posição de KPI.
 */
export const NAV_CHIP: Record<string, [string, string]> = {
  "ops-center": ["#ff9f0a", "#ffc04d"],
  dashboard: ["#ff453a", "#ff6b5c"],
  search: ["#64d2ff", "#8fe0ff"],
  clients: ["#bf5af2", "#d48cff"],
  products: ["#0a84ff", "#4fb3ff"],
  inventory: ["#ff375f", "#ff6b8a"],
  purchases: ["#ff9f0a", "#ffc04d"],
  sales: ["#30d158", "#66e08a"],
  "work-orders": ["#30d158", "#66e08a"],
  salao: ["#0a84ff", "#4fb3ff"],
  cozinha: ["#ff9f0a", "#ffc04d"],
  delivery: ["#bf5af2", "#d48cff"],
  agenda: ["#0a84ff", "#4fb3ff"],
  mechanics: ["#64d2ff", "#8fe0ff"],
  "intelligence-hub": ["#5e5ce6", "#8e8cff"],
  crm: ["#bf5af2", "#d48cff"],
  finance: ["#30d158", "#66e08a"],
  integrations: ["#64d2ff", "#8fe0ff"],
  automacoes: ["#ff9f0a", "#ffc04d"],
  analytics: ["#5e5ce6", "#8e8cff"],
  "painel-executivo": ["#f8c208", "#ffdd55"],
  "analytics-reports": ["#0a84ff", "#4fb3ff"],
  settings: ["#8e8e93", "#aeaeb2"],
};

export function navChipGradient(id: string): string {
  const [a, b] = NAV_CHIP[id] ?? ["#0a84ff", "#4fb3ff"];
  return `linear-gradient(145deg, ${a}, ${b})`;
}

/** Cor (texto, fundo translúcido) do chip de KPI por posição. */
const KPI_CHIPS: ReadonlyArray<[string, string]> = [
  ["#ff453a", "255,69,58"],
  ["#30d158", "48,209,88"],
  ["#f8c208", "248,194,8"],
  ["#4fb3ff", "10,132,255"],
  ["#bf5af2", "191,90,242"],
  ["#ff9f0a", "255,159,10"],
];

export function kpiChipStyle(index: number): { color: string; background: string } {
  const [c, rgb] = KPI_CHIPS[index % KPI_CHIPS.length];
  return { color: c, background: `rgba(${rgb},.14)` };
}

/** Mesma paleta, escolhida de forma estável pelo id do KPI. */
export function kpiChipStyleById(id: string): { color: string; background: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return kpiChipStyle(h);
}
