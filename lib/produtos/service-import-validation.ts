/** Pure validation — sem imports de path alias (testável em Node). */
export type ServiceImportValidationRow = {
  codigo?: string | null;
  nome?: string | null;
  custo?: number | null;
  preco_venda?: number | null;
  preco_sugerido?: number | null;
  categoria?: string | null;
  unidade_cobranca?: string | null;
};

export type ServiceImportIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export function validateServiceImportRow(
  row: ServiceImportValidationRow,
  existingCodes: Set<string>,
): ServiceImportIssue[] {
  const issues: ServiceImportIssue[] = [];
  const nome = row.nome?.trim();
  const codigo = row.codigo?.trim();

  if (!nome) {
    issues.push({
      level: "error",
      code: "nome_obrigatorio",
      message: "Serviço sem nome.",
    });
  }
  if (!codigo) {
    issues.push({
      level: "error",
      code: "codigo_obrigatorio",
      message: "Código obrigatório.",
    });
  } else if (existingCodes.has(codigo.toLowerCase())) {
    issues.push({
      level: "warning",
      code: "codigo_existente",
      message: "Código já existe — será atualizado se a estratégia permitir.",
    });
  }

  if (row.custo != null && row.custo < 0) {
    issues.push({
      level: "error",
      code: "custo_negativo",
      message: "Custo negativo.",
    });
  }
  if (row.preco_venda != null && row.preco_venda < 0) {
    issues.push({
      level: "error",
      code: "preco_negativo",
      message: "Preço negativo.",
    });
  }
  if (row.custo === 0 || row.custo == null) {
    issues.push({
      level: "warning",
      code: "custo_zero",
      message: "Custo zerado — confirme se é intencional.",
    });
  }
  if (row.preco_venda === 0 || row.preco_venda == null) {
    issues.push({
      level: "warning",
      code: "preco_zero",
      message: "Preço zerado — confirme se é intencional.",
    });
  }
  if (
    row.custo != null &&
    row.preco_venda != null &&
    row.preco_venda > 0 &&
    row.preco_venda < row.custo
  ) {
    issues.push({
      level: "warning",
      code: "preco_menor_custo",
      message: "Preço menor que o custo.",
    });
  }

  return issues;
}

export function summarizeServiceImportValidation(
  rows: Array<{ issues: ServiceImportIssue[] }>,
) {
  let validas = 0;
  let comAlerta = 0;
  let invalidas = 0;
  let custoZero = 0;
  let precoZero = 0;

  for (const row of rows) {
    const hasError = row.issues.some((i) => i.level === "error");
    const hasWarn = row.issues.some((i) => i.level === "warning");
    if (hasError) invalidas += 1;
    else if (hasWarn) comAlerta += 1;
    else validas += 1;
    if (row.issues.some((i) => i.code === "custo_zero")) custoZero += 1;
    if (row.issues.some((i) => i.code === "preco_zero")) precoZero += 1;
  }

  return {
    total: rows.length,
    validas,
    comAlerta,
    invalidas,
    custoZero,
    precoZero,
  };
}
