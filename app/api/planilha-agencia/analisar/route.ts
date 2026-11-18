import { montarRespostaAnalise } from "@/lib/planilha-agencia/respostas";
import { lerPedido, resposta } from "@/lib/planilha-agencia/requisicao";
import { prepararDoArquivo } from "@/lib/planilha-agencia/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/planilha-agencia/analisar  (formulário: tenantSlug, file, opcoes?)
 * Lê a planilha, acha a base de clientes e a DRE e devolve a prévia do que será importado.
 * Não grava nada.
 */
export async function POST(request: Request) {
  const pedido = await lerPedido(request);
  if (pedido instanceof Response) return pedido;

  try {
    const { analise, preparo } = await prepararDoArquivo(
      pedido.db,
      pedido.tenant.id,
      pedido.nomeArquivo,
      pedido.bytes,
      pedido.opcoes,
    );
    return resposta(montarRespostaAnalise(analise, preparo));
  } catch (e) {
    return resposta(
      { ok: false, erro: e instanceof Error ? e.message : "Não consegui ler a planilha." },
      422,
    );
  }
}
