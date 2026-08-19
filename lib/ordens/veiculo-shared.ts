export type VeiculoOption = {
  id: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
};

export function formatVeiculoLabel(v: VeiculoOption) {
  const placa = v.placa?.trim() || "Sem placa";
  return [placa, v.marca, v.modelo, v.ano ? String(v.ano) : null, v.cor]
    .filter(Boolean)
    .join(" · ");
}

/** Agenda / lava: "Honda Civic · ABC1D23" */
export function formatVeiculoAgendaLabel(v: VeiculoOption) {
  const name = [v.marca, v.modelo].filter(Boolean).join(" ").trim() || "Veículo";
  const placa = v.placa?.trim();
  return placa ? `${name} · ${placa}` : name;
}
