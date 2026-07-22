import {
  normalizeMasterName,
  onlyDigits,
} from "@/lib/master-data/master-data-validation";
import type {
  DedupCheckResult,
  DedupMatch,
  MasterEntityType,
} from "@/lib/master-data/master-data-types";

type Candidate = {
  id: string;
  label: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  nome?: string | null;
  nomeFantasia?: string | null;
  sku?: string | null;
  codigoBarras?: string | null;
  categoria?: string | null;
  codigo?: string | null;
  tipo?: string | null;
};

function pushMatch(
  matches: DedupMatch[],
  entityType: MasterEntityType,
  candidate: Candidate,
  matchedOn: string[],
  href?: string,
) {
  if (matchedOn.length === 0) return;
  matches.push({
    entityType,
    id: candidate.id,
    label: candidate.label,
    matchedOn,
    href,
  });
}

export function findFornecedorDuplicates(input: {
  excludeId?: string;
  documento?: string | null;
  nome?: string | null;
  nomeFantasia?: string | null;
  email?: string | null;
  candidates: Candidate[];
}): DedupCheckResult {
  const matches: DedupMatch[] = [];
  const doc = onlyDigits(input.documento);
  const nome = normalizeMasterName(input.nome);
  const fantasia = normalizeMasterName(input.nomeFantasia);
  const email = (input.email ?? "").trim().toLowerCase();

  for (const c of input.candidates) {
    if (input.excludeId && c.id === input.excludeId) continue;
    const matchedOn: string[] = [];
    if (doc && onlyDigits(c.documento) === doc) matchedOn.push("documento");
    if (nome && normalizeMasterName(c.nome) === nome) matchedOn.push("nome");
    if (fantasia && normalizeMasterName(c.nomeFantasia) === fantasia) {
      matchedOn.push("nome_fantasia");
    }
    if (email && (c.email ?? "").trim().toLowerCase() === email) {
      matchedOn.push("email");
    }
    pushMatch(matches, "fornecedor", c, matchedOn);
  }

  return { hasDuplicates: matches.length > 0, matches };
}

export function findClienteDuplicates(input: {
  excludeId?: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  candidates: Candidate[];
}): DedupCheckResult {
  const matches: DedupMatch[] = [];
  const doc = onlyDigits(input.documento);
  const email = (input.email ?? "").trim().toLowerCase();
  const tel = onlyDigits(input.telefone);

  for (const c of input.candidates) {
    if (input.excludeId && c.id === input.excludeId) continue;
    const matchedOn: string[] = [];
    if (doc && onlyDigits(c.documento) === doc) matchedOn.push("documento");
    if (email && (c.email ?? "").trim().toLowerCase() === email) {
      matchedOn.push("email");
    }
    if (tel && tel.length >= 8 && onlyDigits(c.telefone) === tel) {
      matchedOn.push("telefone");
    }
    pushMatch(matches, "cliente", c, matchedOn);
  }

  return { hasDuplicates: matches.length > 0, matches };
}

export function findProdutoDuplicates(input: {
  excludeId?: string;
  sku?: string | null;
  codigoBarras?: string | null;
  nome?: string | null;
  categoria?: string | null;
  candidates: Candidate[];
}): DedupCheckResult {
  const matches: DedupMatch[] = [];
  const sku = (input.sku ?? "").trim().toLowerCase();
  const barras = (input.codigoBarras ?? "").trim();
  const nome = normalizeMasterName(input.nome);
  const cat = normalizeMasterName(input.categoria);

  for (const c of input.candidates) {
    if (input.excludeId && c.id === input.excludeId) continue;
    const matchedOn: string[] = [];
    if (sku && (c.sku ?? "").trim().toLowerCase() === sku) matchedOn.push("sku");
    if (barras && (c.codigoBarras ?? "").trim() === barras) {
      matchedOn.push("codigo_barras");
    }
    if (
      nome &&
      cat &&
      normalizeMasterName(c.nome) === nome &&
      normalizeMasterName(c.categoria) === cat
    ) {
      matchedOn.push("nome+categoria");
    }
    pushMatch(matches, "produto", c, matchedOn);
  }

  return { hasDuplicates: matches.length > 0, matches };
}

/**
 * Estrutura preparatória para merge futuro — sem união destrutiva.
 */
export type FutureMergePlan = {
  keepId: string;
  absorbIds: string[];
  entityType: MasterEntityType;
  strategy: "manual_review_required";
};
