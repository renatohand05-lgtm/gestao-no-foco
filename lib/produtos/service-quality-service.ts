import { createServiceBulkService } from "@/lib/produtos/service-bulk-service";
import { csvEscapeCell } from "@/lib/analytics/core/csv-safe";

export type ServiceQualityReport = {
  total: number;
  ativos: number;
  inativos: number;
  semCusto: number;
  semPreco: number;
  precoAbaixoCusto: number;
  semCategoria: number;
  duplicados: number;
  nuncaUtilizados: number;
};

export async function getServiceQualityReport(
  tenantId: string,
): Promise<ServiceQualityReport> {
  const bulk = await createServiceBulkService(tenantId);
  const services = await bulk.listServices();
  const used = await bulk.findUsedServiceIds(services.map((s) => s.id));

  const byCode = new Map<string, number>();
  for (const s of services) {
    const key = (s.codigo_interno || s.sku || s.nome).toLowerCase();
    byCode.set(key, (byCode.get(key) ?? 0) + 1);
  }

  return {
    total: services.length,
    ativos: services.filter((s) => s.ativo).length,
    inativos: services.filter((s) => !s.ativo).length,
    semCusto: services.filter((s) => s.custo == null || s.custo === 0).length,
    semPreco: services.filter(
      (s) => s.preco_venda == null || s.preco_venda === 0,
    ).length,
    precoAbaixoCusto: services.filter(
      (s) =>
        s.custo != null &&
        s.preco_venda != null &&
        s.preco_venda > 0 &&
        s.preco_venda < s.custo,
    ).length,
    semCategoria: services.filter((s) => !s.categoria?.trim()).length,
    duplicados: [...byCode.values()].filter((n) => n > 1).length,
    nuncaUtilizados: services.filter((s) => !used.has(s.id)).length,
  };
}

export async function exportServiceInconsistenciesCsv(
  tenantId: string,
): Promise<string> {
  const bulk = await createServiceBulkService(tenantId);
  const services = await bulk.listServices();
  const header = [
    "id",
    "nome",
    "codigo",
    "custo",
    "preco",
    "categoria",
    "ativo",
    "inconsistencias",
  ];
  const lines = [header.map(csvEscapeCell).join(",")];

  for (const s of services) {
    const issues: string[] = [];
    if (s.custo == null || s.custo === 0) issues.push("custo_zero");
    if (s.preco_venda == null || s.preco_venda === 0) issues.push("preco_zero");
    if (
      s.custo != null &&
      s.preco_venda != null &&
      s.preco_venda > 0 &&
      s.preco_venda < s.custo
    ) {
      issues.push("preco_abaixo_custo");
    }
    if (!s.categoria?.trim()) issues.push("sem_categoria");
    if (issues.length === 0) continue;
    lines.push(
      [
        s.id,
        s.nome,
        s.codigo_interno ?? s.sku ?? "",
        s.custo ?? "",
        s.preco_venda ?? "",
        s.categoria ?? "",
        s.ativo ? "sim" : "nao",
        issues.join("|"),
      ]
        .map(csvEscapeCell)
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\n")}\n`;
}
