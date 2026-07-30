/**
 * Fase 25 — Modelo de almoxarifado / depósito / localização física.
 */

export type WarehouseLocationPath = {
  depositoId: string;
  almoxarifadoId: string | null;
  rua: string | null;
  corredor: string | null;
  prateleira: string | null;
  posicao: string | null;
};

export function formatLocationCode(path: WarehouseLocationPath): string {
  const parts = [
    path.depositoId.slice(0, 8),
    path.almoxarifadoId?.slice(0, 8),
    path.rua,
    path.corredor,
    path.prateleira,
    path.posicao,
  ].filter((p) => p != null && String(p).trim() !== "");
  return parts.join("-").toUpperCase();
}

export function parseLocationCode(code: string): Partial<WarehouseLocationPath> {
  const raw = code.trim();
  if (!raw) return {};
  const [rua, corredor, prateleira, posicao] = raw.split(/[\/\-|]/);
  return {
    rua: rua || null,
    corredor: corredor || null,
    prateleira: prateleira || null,
    posicao: posicao || null,
  };
}

export type DepositoDraft = {
  nome: string;
  codigo: string;
  empresaId: string | null;
  filialId: string | null;
  ativo: boolean;
};

export type AlmoxarifadoDraft = {
  depositoId: string;
  nome: string;
  codigo: string;
  ativo: boolean;
};

export function assertDepositoDraft(d: DepositoDraft): string[] {
  const errors: string[] = [];
  if (!d.nome.trim()) errors.push("Nome do depósito é obrigatório.");
  if (!d.codigo.trim()) errors.push("Código do depósito é obrigatório.");
  return errors;
}

export function assertAlmoxarifadoDraft(d: AlmoxarifadoDraft): string[] {
  const errors: string[] = [];
  if (!d.depositoId.trim()) errors.push("Depósito é obrigatório.");
  if (!d.nome.trim()) errors.push("Nome do almoxarifado é obrigatório.");
  if (!d.codigo.trim()) errors.push("Código do almoxarifado é obrigatório.");
  return errors;
}
