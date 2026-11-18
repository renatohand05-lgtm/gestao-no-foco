/**
 * Lê e valida o pedido (formulário com o arquivo) das rotas de importação de planilha.
 * Confere sessão, acesso à empresa, papel (dono/admin/gerente) e tamanho do arquivo.
 */
import { canAccessModuleImport } from "@/lib/import-engine/adapters/shared/require-import-access";
import { createClient } from "@/lib/supabase/server";
import { getUserTenants } from "@/lib/tenants";
import type { TenantWithRole } from "@/types";

import { sanearOpcoes } from "./preparo";
import type { Db } from "./servidor";
import type { OpcoesImportacao } from "./tipos";

/** Limite do corpo de uma função na Vercel é 4,5 MB; deixamos uma folga. */
export const LIMITE_ARQUIVO_BYTES = 4 * 1024 * 1024;

export function resposta(corpo: Record<string, unknown>, status = 200) {
  return Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
}

export type PedidoValido = {
  tenant: TenantWithRole;
  db: Db;
  nomeArquivo: string;
  bytes: Uint8Array;
  opcoes?: Partial<OpcoesImportacao>;
};

export async function lerPedido(request: Request): Promise<PedidoValido | Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return resposta({ ok: false, erro: "Não consegui ler o envio. Tente de novo." }, 400);
  }

  const slug = form.get("tenantSlug");
  const arquivo = form.get("file");
  if (typeof slug !== "string" || !slug) {
    return resposta({ ok: false, erro: "Empresa não informada." }, 400);
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return resposta({ ok: false, erro: "Escolha a planilha para enviar." }, 400);
  }
  if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
    return resposta(
      {
        ok: false,
        erro: `A planilha tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB e o limite é 4 MB. Apague abas que você não precisa (como gráficos e painéis) e envie de novo.`,
      },
      413,
    );
  }

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return resposta({ ok: false, erro: "Sessão expirada. Entre de novo." }, 401);

  const tenants = await getUserTenants();
  const tenant = tenants.find((t) => t.slug === slug);
  if (!tenant) return resposta({ ok: false, erro: "Você não tem acesso a esta empresa." }, 403);
  if (!canAccessModuleImport(tenant)) {
    return resposta(
      { ok: false, erro: "Só o dono, o administrador ou o gerente da empresa pode importar planilhas." },
      403,
    );
  }

  let opcoes: Partial<OpcoesImportacao> | undefined;
  const bruto = form.get("opcoes");
  if (typeof bruto === "string" && bruto) {
    try {
      opcoes = sanearOpcoes(JSON.parse(bruto));
    } catch {
      return resposta({ ok: false, erro: "As escolhas enviadas estão inválidas." }, 400);
    }
  }

  return {
    tenant,
    db: client as unknown as Db,
    nomeArquivo: arquivo.name,
    bytes: new Uint8Array(await arquivo.arrayBuffer()),
    opcoes,
  };
}
