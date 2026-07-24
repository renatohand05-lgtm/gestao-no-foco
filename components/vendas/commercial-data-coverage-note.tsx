import type { CiDataCoverage } from "@/lib/vendas/commercial-intelligence-types";

type Props = {
  cobertura: CiDataCoverage;
};

/** Nota discreta de confiabilidade — não é KPI principal. */
export function CommercialDataCoverageNote({ cobertura }: Props) {
  if (cobertura.totalAvaliadas === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Sem vendas faturadas no período para avaliar cobertura de dados.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <p className="font-medium text-foreground/80">Qualidade dos dados</p>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <li>
          Origem:{" "}
          {cobertura.coberturaOrigemPct == null
            ? "—"
            : `${cobertura.coberturaOrigemPct}%`}{" "}
          ({cobertura.comOrigem}/{cobertura.totalAvaliadas})
        </li>
        <li>
          Responsável confirmado:{" "}
          {cobertura.coberturaResponsavelPct == null
            ? "—"
            : `${cobertura.coberturaResponsavelPct}%`}{" "}
          ({cobertura.comResponsavelConfirmado}/{cobertura.totalAvaliadas})
        </li>
        <li>Sem origem: {cobertura.semOrigem}</li>
        <li>Sem responsável: {cobertura.semResponsavelConfirmado}</li>
        <li>Sem cliente: {cobertura.semCliente}</li>
      </ul>
      {cobertura.avisoOrigem ? (
        <p className="mt-1 text-amber-800 dark:text-amber-200">
          {cobertura.avisoOrigem}
        </p>
      ) : null}
      <p className="mt-1">
        Vendas históricas sem canal registrado aparecem como “Sem origem”.
      </p>
    </div>
  );
}
