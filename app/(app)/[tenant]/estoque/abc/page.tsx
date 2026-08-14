import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { classifyAbcCurve } from "@/lib/estoque/abc/abc-curve";
import { formatCurrency, formatPercent } from "@/lib/format";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Curva ABC · Estoque" };
export const dynamic = "force-dynamic";

export default async function EstoqueAbcPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, sku, estoque_atual, custo, preco_venda, ativo")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .eq("ativo", true)
    .limit(500);

  const items = (data ?? []).map((p) => {
    const qtd = Number(p.estoque_atual ?? 0);
    const unit = Number(p.custo ?? 0) || Number(p.preco_venda ?? 0) || 0;
    return {
      id: p.id,
      label: p.sku ? `${p.nome} (${p.sku})` : p.nome,
      valor: qtd * unit,
    };
  });

  const curve = classifyAbcCurve(items);
  const counts = {
    A: curve.filter((c) => c.classe === "A").length,
    B: curve.filter((c) => c.classe === "B").length,
    C: curve.filter((c) => c.classe === "C").length,
  };

  return (
    <div className="space-y-6" data-phase28="estoque-abc">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Curva ABC</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Por valor em estoque (qtd × custo; fallback preço). Período/filial
            avançados na 28.7.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/${tenantSlug}/estoque`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Estoque
          </Link>
          <Link
            href={`/${tenantSlug}/estoque/reposicao`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            Reposição
          </Link>
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>
              {mapDatabaseErrorToUserMessage(error)}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric title="Classe A" value={String(counts.A)} />
        <Metric title="Classe B" value={String(counts.B)} />
        <Metric title="Classe C" value={String(counts.C)} />
      </div>

      {curve.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem itens com valor</CardTitle>
            <CardDescription>
              Cadastre produtos com estoque e custo para classificar.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Classe</th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Participação</th>
                <th className="px-3 py-2">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {curve.slice(0, 100).map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.classe}</td>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatCurrency(row.valor)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatPercent(row.participacao * 100)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatPercent(row.acumulado * 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
