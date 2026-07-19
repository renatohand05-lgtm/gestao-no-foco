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
