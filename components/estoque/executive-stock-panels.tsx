import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import type {
  EscAlert,
  EscCompraRec,
  EscDistribuicaoRow,
  EscProductInsight,
  EscRankingRow,
  ExecutiveStockData,
} from "@/lib/estoque/executive-stock-types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function money(v: number | null | undefined, available = true): string {
  if (!available || v == null) return "Indisponível";
  return formatCurrency(v);
}

function sevClass(s: EscAlert["severidade"]) {
  if (s === "critica") return "border-red-300/80 bg-red-50/50 dark:bg-red-950/20";
  if (s === "alta") return "border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/20";
  if (s === "media") return "border-yellow-300/60";
  return "border-muted";
}

export function ExecutiveStockDrillLinks({
  tenantSlug,
  produtoId,
  produtoNome,
}: {
  tenantSlug: string;
  produtoId: string;
  produtoNome: string;
}) {
  const q = encodeURIComponent(produtoNome);
  const links = [
    { label: "Produto", href: `/${tenantSlug}/produtos/${produtoId}` },
    {
      label: "Fornecedor",
      href: `/${tenantSlug}/financeiro/fornecedores`,
    },
    { label: "Movimentações", href: `/${tenantSlug}/estoque?q=${q}` },
    // Sem filtro por produto na Central de OS — abrir lista principal.
    { label: "OS", href: `/${tenantSlug}/ordens` },
    // NF-e sem searchParams de produto — lista principal.
    { label: "Compras", href: `/${tenantSlug}/estoque/notas-fiscais` },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          className="text-primary underline-offset-2 hover:underline"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

export function ExecutiveStockAlerts({ alerts }: { alerts: EscAlert[] }) {
  if (alerts.length === 0) {
    return (
      <SectionCard title="Centro de alertas">
        <p className="text-sm text-muted-foreground">
          Nenhum alerta na carteira filtrada.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Centro de alertas" description="Ordenado por impacto financeiro">
      <ul className="space-y-3">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={cn("rounded-lg border p-3", sevClass(a.severidade))}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {a.severidade} · {a.tipo}
                </p>
                <p className="font-medium">{a.titulo}</p>
                <p className="text-sm text-muted-foreground">{a.descricao}</p>
                <p className="text-sm">
                  Impacto: {money(a.impacto)} · Ação: {a.acao}
                </p>
              </div>
              <Link
                href={a.href}
                className="shrink-0 text-sm text-primary underline-offset-2 hover:underline"
              >
                Abrir
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ProductCards({
  title,
  description,
  rows,
  tenantSlug,
  empty,
}: {
  title: string;
  description?: string;
  rows: EscProductInsight[];
  tenantSlug: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <SectionCard title={title} description={description}>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title} description={description}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Produto</th>
              <th className="py-2 pr-2 font-medium">Categoria</th>
              <th className="py-2 pr-2 font-medium">Fornecedor</th>
              <th className="py-2 pr-2 font-medium text-right">Saldo</th>
              <th className="py-2 pr-2 font-medium text-right">Mínimo</th>
              <th className="py-2 pr-2 font-medium text-right">Valor</th>
              <th className="py-2 pr-2 font-medium text-right">Impacto</th>
              <th className="py-2 font-medium">Última mov.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 align-top">
                <td className="py-2 pr-2">
                  <Link
                    href={`/${tenantSlug}/produtos/${r.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.nome}
                  </Link>
                  <div className="mt-1">
                    <ExecutiveStockDrillLinks
                      tenantSlug={tenantSlug}
                      produtoId={r.id}
                      produtoNome={r.nome}
                    />
                  </div>
                </td>
                <td className="py-2 pr-2">{r.categoria}</td>
                <td className="py-2 pr-2">{r.fornecedor}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{r.saldo}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {r.minimo == null ? "Indisponível" : r.minimo}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {money(r.valor, r.valorDisponivel)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {money(r.impactoFinanceiro)}
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {r.ultimaMovimentacao
                    ? new Date(r.ultimaMovimentacao).toLocaleDateString("pt-BR")
                    : "Indisponível"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile / tablet cards */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border p-3 space-y-2">
            <Link
              href={`/${tenantSlug}/produtos/${r.id}`}
              className="font-medium text-primary hover:underline"
            >
              {r.nome}
            </Link>
            <p className="text-xs text-muted-foreground">
              {r.categoria} · {r.fornecedor}
            </p>
            <dl className="grid grid-cols-2 gap-1 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Saldo</dt>
                <dd className="tabular-nums">{r.saldo}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Mínimo</dt>
                <dd className="tabular-nums">
                  {r.minimo == null ? "Indisponível" : r.minimo}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Valor</dt>
                <dd className="tabular-nums">
                  {money(r.valor, r.valorDisponivel)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Impacto</dt>
                <dd className="tabular-nums">{money(r.impactoFinanceiro)}</dd>
              </div>
            </dl>
            <ExecutiveStockDrillLinks
              tenantSlug={tenantSlug}
              produtoId={r.id}
              produtoNome={r.nome}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ExecutiveStockCriticos({
  rows,
  tenantSlug,
}: {
  rows: EscProductInsight[];
  tenantSlug: string;
}) {
  return (
    <ProductCards
      title="Produtos críticos"
      description="Ordenação: menor cobertura → maior impacto → menor saldo"
      rows={rows}
      tenantSlug={tenantSlug}
      empty="Nenhum produto crítico na carteira filtrada."
    />
  );
}

export function ExecutiveStockParados({
  rows,
  tenantSlug,
}: {
  rows: ExecutiveStockData["parados"];
  tenantSlug: string;
}) {
  if (rows.length === 0) {
    return (
      <SectionCard title="Produtos parados">
        <p className="text-sm text-muted-foreground">
          Nenhum produto parado na carteira filtrada.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Produtos parados" description="Ordenado por valor parado">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Produto</th>
              <th className="py-2 pr-2 font-medium text-right">Valor</th>
              <th className="py-2 pr-2 font-medium text-right">Dias sem mov.</th>
              <th className="py-2 pr-2 font-medium">Fornecedor</th>
              <th className="py-2 font-medium text-right">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="py-2 pr-2">
                  <Link
                    href={r.href}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.nome}
                  </Link>
                  <div className="mt-1">
                    <ExecutiveStockDrillLinks
                      tenantSlug={tenantSlug}
                      produtoId={r.id}
                      produtoNome={r.nome}
                    />
                  </div>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {money(r.valor, r.valorDisponivel)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {r.diasSemMovimentacao == null
                    ? "Indisponível"
                    : r.diasSemMovimentacao}
                </td>
                <td className="py-2 pr-2">{r.fornecedor}</td>
                <td className="py-2 text-right tabular-nums">{r.quantidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border p-3 space-y-1">
            <Link href={r.href} className="font-medium text-primary hover:underline">
              {r.nome}
            </Link>
            <p className="text-sm">
              {money(r.valor, r.valorDisponivel)} ·{" "}
              {r.diasSemMovimentacao == null
                ? "Indisponível"
                : `${r.diasSemMovimentacao} dias`}{" "}
              · qtd {r.quantidade}
            </p>
            <p className="text-xs text-muted-foreground">{r.fornecedor}</p>
            <ExecutiveStockDrillLinks
              tenantSlug={tenantSlug}
              produtoId={r.id}
              produtoNome={r.nome}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ExecutiveStockCompras({
  rows,
  tenantSlug,
}: {
  rows: EscCompraRec[];
  tenantSlug: string;
}) {
  if (rows.length === 0) {
    return (
      <SectionCard title="Compras recomendadas">
        <p className="text-sm text-muted-foreground">
          Nenhuma sugestão determinística (saldo ≥ mínimo ou sem mínimo).
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Compras recomendadas"
      description="Regra: quantidade = máximo(0, mínimo − saldo). Sem previsão de demanda."
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.produtoId} className="rounded-lg border p-3 space-y-1">
            <Link
              href={r.href}
              className="font-medium text-primary hover:underline"
            >
              {r.nome}
            </Link>
            <p className="text-sm">
              Comprar <span className="font-semibold tabular-nums">{r.quantidadeSugerida}</span>{" "}
              (saldo {r.saldo} / mín. {r.minimo})
            </p>
            <p className="text-xs text-muted-foreground">{r.motivo}</p>
            <ExecutiveStockDrillLinks
              tenantSlug={tenantSlug}
              produtoId={r.produtoId}
              produtoNome={r.nome}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function RankingBlock({
  title,
  rows,
  valueKind = "number",
}: {
  title: string;
  rows: EscRankingRow[];
  valueKind?: "number" | "currency" | "ratio";
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Indisponível / sem dados.</p>
      ) : (
        <ol className="space-y-1.5 text-sm">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-1"
            >
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">{i + 1}. </span>
                {r.label}
              </span>
              <span className="shrink-0 tabular-nums">
                {valueKind === "currency"
                  ? money(r.valor)
                  : valueKind === "ratio"
                    ? r.valor.toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })
                    : r.valor.toLocaleString("pt-BR")}
                {r.participacaoPct != null ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({r.participacaoPct}%)
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ExecutiveStockRankings({
  rankings,
}: {
  rankings: ExecutiveStockData["rankings"];
}) {
  return (
    <SectionCard title="Rankings">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <RankingBlock title="Mais vendidos (90d)" rows={rankings.maisVendidos} />
        <RankingBlock
          title="Maior giro (proxy 90d)"
          rows={rankings.maiorGiro}
          valueKind="ratio"
        />
        <RankingBlock
          title="Maior valor em estoque"
          rows={rankings.maiorValor}
          valueKind="currency"
        />
        <RankingBlock
          title="Mais parados"
          rows={rankings.maisParados}
          valueKind="currency"
        />
        <RankingBlock
          title="Categorias"
          rows={rankings.categorias}
          valueKind="currency"
        />
        <RankingBlock
          title="Fornecedores"
          rows={rankings.fornecedores}
          valueKind="currency"
        />
        <RankingBlock
          title="Maior consumo em OS"
          rows={rankings.consumoOs}
        />
      </div>
    </SectionCard>
  );
}

function DistBlock({
  title,
  rows,
}: {
  title: string;
  rows: EscDistribuicaoRow[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Indisponível.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex justify-between gap-2 border-b border-border/40 pb-1"
            >
              <span className="truncate">
                {r.label}{" "}
                <span className="text-xs text-muted-foreground">
                  ({r.quantidade})
                </span>
              </span>
              <span className="tabular-nums shrink-0">
                {money(r.valor)}
                {r.participacaoPct != null ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {r.participacaoPct}%
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExecutiveStockDistribuicao({
  distribuicao,
}: {
  distribuicao: ExecutiveStockData["distribuicao"];
}) {
  return (
    <SectionCard title="Distribuição">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <DistBlock title="Por categoria" rows={distribuicao.categoria} />
        <DistBlock title="Por fornecedor" rows={distribuicao.fornecedor} />
        <DistBlock title="Por faixa de valor" rows={distribuicao.faixaValor} />
        <DistBlock title="Por situação" rows={distribuicao.situacao} />
      </div>
    </SectionCard>
  );
}
