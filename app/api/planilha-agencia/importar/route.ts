import { revalidatePath } from "next/cache";

import { logger } from "@/lib/observability/logger";
import { lerPedido, resposta } from "@/lib/planilha-agencia/requisicao";
import { gravarImportacao, prepararDoArquivo } from "@/lib/planilha-agencia/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/planilha-agencia/importar  (formulário: tenantSlug, file, opcoes)
 * Refaz a análise com as escolhas da pessoa e grava clientes e lançamentos da DRE.
 * Pode ser repetido com o mesmo arquivo: o que já entrou é reconhecido e não duplica.
 */
export async function POST(request: Request) {
  const pedido = await lerPedido(request);
  if (pedido instanceof Response) return pedido;
  if (!pedido.opcoes) {
    return resposta({ ok: false, erro: "Confira a prévia e confirme as escolhas antes de importar." }, 400);
  }

  try {
    const { analise, preparo } = await prepararDoArquivo(
      pedido.db,
      pedido.tenant.id,
      pedido.nomeArquivo,
      pedido.bytes,
      pedido.opcoes,
    );
    const { resumo, avisos } = await gravarImportacao(pedido.db, pedido.tenant.id, analise, preparo);

    const base = `/${pedido.tenant.slug}`;
    for (const caminho of ["/painel-executivo", "/clientes", "/financeiro", "/financeiro/dre", "/dashboard"]) {
      revalidatePath(`${base}${caminho}`);
    }
    logger.info("planilha-agencia: importação concluída", {
      tenantId: pedido.tenant.id,
      arquivo: pedido.nomeArquivo,
      ...resumo,
      mesesImportados: resumo.mesesImportados.length,
    });
    return resposta({ ok: true, resumo, avisos });
  } catch (e) {
    logger.warn("planilha-agencia: importação falhou", {
      tenantId: pedido.tenant.id,
      erro: e instanceof Error ? e.message : String(e),
    });
    return resposta(
      { ok: false, erro: e instanceof Error ? e.message : "Não consegui importar a planilha." },
      422,
    );
  }
}
