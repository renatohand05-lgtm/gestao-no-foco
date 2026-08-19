import "server-only";

import { getAppBaseUrl } from "@/lib/config/app-url";
import { formatCurrency } from "@/lib/format";
import { createCompartilhamentoService } from "@/lib/ordens/compartilhamento-service";
import { createOrcamentoVersaoService } from "@/lib/ordens/orcamento-versao-service";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";

/**
 * Após publicar versão: gera link seguro e enfileira BUDGET_PUBLISHED.
 * Falha de comunicação não desfaz a publicação. Sem receita, estoque ou NF.
 */
export async function enqueueBudgetPublishedAfterPublish(input: {
  tenantId: string;
  tenantName: string;
  segment?: string | null;
  osId: string;
  versaoId: string;
  valorTotal: number;
  userId: string | null;
}): Promise<void> {
  const osSvc = await createOrdemServicoService(input.tenantId);
  const os = await osSvc.getById(input.osId);
  if (!os?.cliente_id) return;

  const shareSvc = await createCompartilhamentoService(input.tenantId);
  const share = await shareSvc.createShare(
    input.osId,
    { canal: "link", versaoOrcamentoId: input.versaoId },
    input.userId,
  );
  const orc = await createOrcamentoVersaoService(input.tenantId);
  await orc.markEnviado(input.versaoId);

  const { enqueueCustomerNotification } = await import("./notify");
  await enqueueCustomerNotification({
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    segment: input.segment,
    clienteId: os.cliente_id,
    entityType: "os",
    entityId: os.id,
    templateCode: "BUDGET_PUBLISHED",
    offsetKey: "BUDGET_PUBLISHED",
    messageCtx: {
      modelo: os.modelo ?? "",
      placa: os.placa ?? "",
      veiculo: [os.modelo, os.placa].filter(Boolean).join(" · "),
      valor: formatCurrency(input.valorTotal),
      secure_link: `${getAppBaseUrl()}${share.urlPath}`,
    },
    userId: input.userId ?? undefined,
  });
}
