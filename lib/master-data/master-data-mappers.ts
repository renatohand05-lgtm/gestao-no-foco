/** Mappers Master Data — placeholders leves para contratos futuros. */

export function mapFornecedorOption(row: {
  id: string;
  nome: string;
  documento?: string | null;
  nome_fantasia?: string | null;
}) {
  return {
    id: row.id,
    nome: row.nome_fantasia?.trim() || row.nome,
    documento: row.documento ?? null,
  };
}
