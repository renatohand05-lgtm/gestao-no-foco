import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { suggestReposicao } from "@/lib/estoque/abc/abc-curve";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Reposição · Estoque" };
export const dynamic = "force-dynamic";

export default async function EstoqueReposicaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("produtos")
    .select(
      "id, nome, sku, estoque_atual, estoque_minimo, estoque_maximo, ativo",
    )
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .eq("ativo", true)
    .limit(500);

  const suggestions = (data ?? [])
    .map((p) =>
      suggestReposicao({
        produtoId: p.id,
        label: p.sku ? `${p.nome} (${p.sku})` : p.nome,
        estoqueAtual: Number(p.estoque_atual ?? 0),
        estoqueMinimo: Number(p.estoque_minimo ?? 0),
        estoqueMaximo:
          p.estoque_maximo != null ? Number(p.estoque_maximo) : null,
      }),
    )
    .filter(Boolean);

  return (
    <div className="space-y-6" data-phase28="estoque-reposicao">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sugestões de reposição
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Não gera pedido automaticamente. Autorize em Compras.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/${tenantSlug}/estoque/abc`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Curva ABC
          </Link>
          <Link
            href={`/${tenantSlug}/compras`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Ir para Compras
          </Link>
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-1">
          <CardDescription>Itens sugeridos</CardDescription>
          <CardTitle className="text-xl tabular-nums">
            {suggestions.length}
          </CardTitle>
        </CardHeader>
      </Card>

      {suggestions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma sugestão</CardTitle>
            <CardDescription>
              Nenhum produto abaixo do mínimo / ponto de reposição.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Atual</th>
                <th className="px-3 py-2">Mínimo</th>
                <th className="px-3 py-2">Ponto</th>
                <th className="px-3 py-2">Qtd sugerida</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) =>
                s ? (
                  <tr key={s.produtoId} className="border-t">
                    <td className="px-3 py-2">{s.label}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.estoqueAtual}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.estoqueMinimo}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.pontoReposicao}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium">
                      {s.quantidadeSugerida}
                    </td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Sugestão ≠ pedido. Fluxo completo permanece em Compras (solicitação →
          cotação → aprovação).
        </CardContent>
      </Card>
    </div>
  );
}
