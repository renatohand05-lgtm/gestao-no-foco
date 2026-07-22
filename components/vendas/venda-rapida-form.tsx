"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/ui/save-button";
import {
  DESCONTO_TIPO_LABELS,
  DESCONTO_TIPOS,
} from "@/lib/permissoes/constants";
import {
  buscarProdutoCodigoAction,
  concluirVendaRapidaAction,
} from "@/lib/vendas/venda-rapida-actions";
import type { ProdutoBalcao } from "@/lib/vendas/venda-rapida-service";
import { calcItemTotal, formatCurrency } from "@/lib/vendas/format";
import { cn } from "@/lib/utils";

type Option = { id: string; nome: string; tipo?: string };

type Line = {
  key: string;
  produto_id: string;
  nome: string;
  sku: string | null;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  estoque_atual: number;
  custo: number | null;
};

type PayLine = {
  key: string;
  forma_pagamento_id: string;
  valor: number;
  quantidade_parcelas: number;
};

type Props = {
  tenantSlug: string;
  produtos: ProdutoBalcao[];
  clientes: Option[];
  formasPagamento: Option[];
  contasBancarias: Option[];
};

export function VendaRapidaForm({
  tenantSlug,
  produtos,
  clientes,
  formasPagamento,
  contasBancarias,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<
    Array<{ id: string; nome: string; matched_on: string }> | null
  >(null);
  const [forceCreate, setForceCreate] = useState(false);
  const [modo, setModo] = useState<"nao_identificado" | "existente" | "rapido">(
    "nao_identificado",
  );
  const [clienteId, setClienteId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [descontoTotal, setDescontoTotal] = useState(0);
  const [descontoPct, setDescontoPct] = useState(0);
  const [descontoMotivo, setDescontoMotivo] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<(typeof DESCONTO_TIPOS)[number]>("negociacao_comercial");
  const [formaId, setFormaId] = useState(formasPagamento[0]?.id ?? "");
  const [splitPagamentos, setSplitPagamentos] = useState(false);
  const [payLines, setPayLines] = useState<PayLine[]>([
    {
      key: "p0",
      forma_pagamento_id: formasPagamento[0]?.id ?? "",
      valor: 0,
      quantidade_parcelas: 1,
    },
  ]);
  const [contaId, setContaId] = useState(contasBancarias[0]?.id ?? "");
  const [receberAgora, setReceberAgora] = useState(true);
  const [obs, setObs] = useState("");

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + calcItemTotal(l.quantidade, l.preco_unitario, l.desconto),
        0,
      ),
    [lines],
  );

  const descontoEfetivo = useMemo(() => {
    if (descontoTotal > 0) return descontoTotal;
    if (descontoPct > 0) return Number(((subtotal * descontoPct) / 100).toFixed(2));
    return 0;
  }, [descontoTotal, descontoPct, subtotal]);

  const total = Math.max(0, subtotal - descontoEfetivo);

  const somaPagamentos = useMemo(
    () => payLines.reduce((s, p) => s + (Number(p.valor) || 0), 0),
    [payLines],
  );
  const diferencaPagamentos = Number((total - somaPagamentos).toFixed(2));

  function addProduto(p: ProdutoBalcao) {
    setLines((prev) => {
      const existing = prev.find((l) => l.produto_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.produto_id === p.id
            ? { ...l, quantidade: l.quantidade + 1 }
            : l,
        );
      }
      return [
        ...prev,
        {
          key: `${p.id}-${Date.now()}`,
          produto_id: p.id,
          nome: p.nome,
          sku: p.sku,
          quantidade: 1,
          preco_unitario: p.preco_venda,
          desconto: 0,
          estoque_atual: p.estoque_atual,
          custo: p.custo,
        },
      ];
    });
  }

  async function onBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    const result = await buscarProdutoCodigoAction(tenantSlug, code);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (!result.produto) {
      setError(`Produto não encontrado: ${code}`);
      return;
    }
    setError(null);
    addProduto(result.produto);
    setBarcode("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAlerts([]);
    setDuplicates(null);

    if (lines.length === 0) {
      setError("Adicione ao menos um produto.");
      return;
    }

    let pagamentos:
      | Array<{
          forma_pagamento_id: string;
          valor: number;
          quantidade_parcelas: number;
        }>
      | undefined;
    let formaPrincipal = formaId;

    if (splitPagamentos) {
      if (payLines.length === 0 || payLines.some((p) => !p.forma_pagamento_id)) {
        setError("Informe a forma em cada linha de pagamento.");
        return;
      }
      if (Math.abs(diferencaPagamentos) > 0.01) {
        setError(
          `Soma dos pagamentos (${formatCurrency(somaPagamentos)}) deve igualar o total (${formatCurrency(total)}).`,
        );
        return;
      }
      pagamentos = payLines.map((p) => ({
        forma_pagamento_id: p.forma_pagamento_id,
        valor: Number(p.valor),
        quantidade_parcelas: p.quantidade_parcelas || 1,
      }));
      formaPrincipal = [...pagamentos].sort((a, b) => b.valor - a.valor)[0]
        .forma_pagamento_id;
    }

    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await concluirVendaRapidaAction(tenantSlug, {
        modo_cliente: modo,
        cliente_id: clienteId || "",
        force_create_cliente: forceCreate,
        cliente_rapido:
          modo === "rapido"
            ? {
                nome: String(fd.get("rapido_nome") ?? ""),
                telefone: String(fd.get("rapido_telefone") ?? "") || null,
                documento: String(fd.get("rapido_documento") ?? "") || null,
              }
            : undefined,
        itens: lines.map((l) => ({
          produto_id: l.produto_id,
          quantidade: l.quantidade,
          preco_unitario: l.preco_unitario,
          desconto: l.desconto,
        })),
        desconto_total: descontoTotal,
        desconto_percentual: descontoPct,
        desconto_motivo: descontoMotivo || null,
        desconto_tipo: descontoEfetivo > 0 ? descontoTipo : null,
        forma_pagamento_id: formaPrincipal,
        pagamentos,
        conta_bancaria_id: receberAgora ? contaId : "",
        receber_agora: receberAgora,
        observacoes: obs || null,
      });

      if (!result.success) {
        setError(result.error);
        if ("duplicates" in result && result.duplicates?.length) {
          setDuplicates(result.duplicates);
        }
        return;
      }
      if (result.alerts?.length) setAlerts(result.alerts);
      router.push(`/${tenantSlug}/vendas/${result.id}?success=faturado_recebido`);
      router.refresh();
    });
  }

  return (
    <form id="venda-rapida-form" onSubmit={onSubmit} className="space-y-5">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {alerts.length ? (
        <FeedbackMessage variant="warning">{alerts.join(" · ")}</FeedbackMessage>
      ) : null}

      {duplicates?.length ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="font-medium">Possível cadastro duplicado</p>
          <ul className="space-y-2">
            {duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {d.nome}{" "}
                  <span className="text-muted-foreground">· {d.matched_on}</span>
                </span>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => {
                    setModo("existente");
                    setClienteId(d.id);
                    setDuplicates(null);
                    setError(null);
                    setForceCreate(false);
                  }}
                >
                  Usar este
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              onClick={() => {
                setDuplicates(null);
                setError(null);
                setForceCreate(false);
              }}
            >
              Revisar dados
            </button>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
              onClick={() => {
                setForceCreate(true);
                setDuplicates(null);
                (
                  document.getElementById("venda-rapida-form") as HTMLFormElement | null
                )?.requestSubmit();
              }}
            >
              Criar novo mesmo assim
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["nao_identificado", "Sem cliente"],
            ["existente", "Cliente existente"],
            ["rapido", "Cadastro rápido"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={cn(
              buttonVariants({
                variant: modo === value ? "default" : "outline",
                size: "lg",
              }),
            )}
            onClick={() => setModo(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {modo === "existente" ? (
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Cliente</span>
          <select
            required
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {modo === "rapido" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block space-y-1 text-sm md:col-span-1">
            <span className="text-muted-foreground">Nome *</span>
            <Input name="rapido_nome" required className="h-11" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Telefone</span>
            <Input name="rapido_telefone" className="h-11" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">CPF/CNPJ</span>
            <Input name="rapido_documento" className="h-11" />
          </label>
        </div>
      ) : null}

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Código de barras / SKU</span>
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={onBarcodeKeyDown}
          placeholder="Leia o código e pressione Enter"
          className="h-12 text-base"
          autoFocus
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Ou escolha o produto</span>
        <select
          className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
          onChange={(e) => {
            const p = produtos.find((x) => x.id === e.target.value);
            if (p) addProduto(p);
            e.target.value = "";
          }}
        >
          <option value="">Adicionar produto…</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
              {p.sku ? ` (${p.sku})` : ""} — est. {p.estoque_atual}
            </option>
          ))}
        </select>
      </label>

      {lines.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Produto</th>
                <th className="p-2 w-24">Qtd</th>
                <th className="p-2 w-28">Preço</th>
                <th className="p-2 w-28">Desc.</th>
                <th className="p-2 w-28">Total</th>
                <th className="p-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="border-t">
                  <td className="p-2">
                    <p className="font-medium">{l.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Est. {l.estoque_atual}
                      {l.custo == null || l.custo <= 0
                        ? " · sem custo"
                        : l.preco_unitario < l.custo
                          ? " · abaixo do custo"
                          : ""}
                    </p>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0.001}
                      step="any"
                      value={l.quantidade}
                      className="h-9"
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.key === l.key
                              ? { ...x, quantidade: Number(e.target.value) || 0 }
                              : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.preco_unitario}
                      className="h-9"
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.key === l.key
                              ? {
                                  ...x,
                                  preco_unitario: Number(e.target.value) || 0,
                                }
                              : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.desconto}
                      className="h-9"
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.key === l.key
                              ? { ...x, desconto: Number(e.target.value) || 0 }
                              : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="p-2">
                    {formatCurrency(
                      calcItemTotal(l.quantidade, l.preco_unitario, l.desconto),
                    )}
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-destructive text-xs underline"
                      onClick={() =>
                        setLines((prev) => prev.filter((x) => x.key !== l.key))
                      }
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum item. Leia o código de barras ou escolha um produto.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Desconto R$</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={descontoTotal}
            onChange={(e) => setDescontoTotal(Number(e.target.value) || 0)}
            className="h-11"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Desconto %</span>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={descontoPct}
            onChange={(e) => setDescontoPct(Number(e.target.value) || 0)}
            className="h-11"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Tipo</span>
          <select
            value={descontoTipo}
            onChange={(e) =>
              setDescontoTipo(e.target.value as (typeof DESCONTO_TIPOS)[number])
            }
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {DESCONTO_TIPOS.map((t) => (
              <option key={t} value={t}>
                {DESCONTO_TIPO_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Motivo do desconto</span>
          <Input
            value={descontoMotivo}
            onChange={(e) => setDescontoMotivo(e.target.value)}
            className="h-11"
            placeholder={descontoEfetivo > 0 ? "Obrigatório" : "Opcional"}
          />
        </label>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Pagamento</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={splitPagamentos}
              onChange={(e) => {
                const on = e.target.checked;
                setSplitPagamentos(on);
                if (on) {
                  setPayLines([
                    {
                      key: `p-${Date.now()}`,
                      forma_pagamento_id: formaId || formasPagamento[0]?.id || "",
                      valor: Number(total.toFixed(2)),
                      quantidade_parcelas: 1,
                    },
                  ]);
                }
              }}
            />
            Múltiplas formas (dinheiro, PIX, cartão…)
          </label>
        </div>

        {!splitPagamentos ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Forma de pagamento *</span>
              <select
                required
                value={formaId}
                onChange={(e) => setFormaId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Selecione…</option>
                {formasPagamento.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                    {f.tipo ? ` (${f.tipo})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm md:pt-6">
              <input
                type="checkbox"
                checked={receberAgora}
                onChange={(e) => setReceberAgora(e.target.checked)}
              />
              Receber agora (caixa)
            </label>
            {receberAgora ? (
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Conta bancária *</span>
                <select
                  required
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Selecione…</option>
                  {contasBancarias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {payLines.map((p, idx) => (
              <div
                key={p.key}
                className="grid gap-2 md:grid-cols-[1.4fr_1fr_0.7fr_auto]"
              >
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Forma {idx + 1}</span>
                  <select
                    value={p.forma_pagamento_id}
                    onChange={(e) =>
                      setPayLines((rows) =>
                        rows.map((r) =>
                          r.key === p.key
                            ? { ...r, forma_pagamento_id: e.target.value }
                            : r,
                        ),
                      )
                    }
                    className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Selecione…</option>
                    {formasPagamento.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                        {f.tipo ? ` (${f.tipo})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={p.valor || ""}
                    onChange={(e) =>
                      setPayLines((rows) =>
                        rows.map((r) =>
                          r.key === p.key
                            ? { ...r, valor: Number(e.target.value) || 0 }
                            : r,
                        ),
                      )
                    }
                    className="h-11"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Parcelas</span>
                  <Input
                    type="number"
                    min={1}
                    max={48}
                    value={p.quantidade_parcelas}
                    onChange={(e) =>
                      setPayLines((rows) =>
                        rows.map((r) =>
                          r.key === p.key
                            ? {
                                ...r,
                                quantidade_parcelas: Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                ),
                              }
                            : r,
                        ),
                      )
                    }
                    className="h-11"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={payLines.length <= 1}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                    onClick={() =>
                      setPayLines((rows) => rows.filter((r) => r.key !== p.key))
                    }
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                onClick={() =>
                  setPayLines((rows) => [
                    ...rows,
                    {
                      key: `p-${Date.now()}`,
                      forma_pagamento_id: formasPagamento[0]?.id ?? "",
                      valor: Math.max(0, Number(diferencaPagamentos.toFixed(2))),
                      quantidade_parcelas: 1,
                    },
                  ])
                }
              >
                + Forma de pagamento
              </button>
              <p
                className={
                  Math.abs(diferencaPagamentos) > 0.01
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground"
                }
              >
                Soma {formatCurrency(somaPagamentos)} · falta{" "}
                {formatCurrency(diferencaPagamentos)}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={receberAgora}
                onChange={(e) => setReceberAgora(e.target.checked)}
              />
              Receber agora (caixa) — aplica à conta abaixo
            </label>
            {receberAgora ? (
              <label className="block max-w-sm space-y-1 text-sm">
                <span className="text-muted-foreground">Conta bancária *</span>
                <select
                  required
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Selecione…</option>
                  {contasBancarias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        )}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Observação</span>
        <Input
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          className="h-11"
        />
      </label>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-1 text-sm">
          <p>
            Subtotal: <strong>{formatCurrency(subtotal)}</strong>
          </p>
          <p>
            Desconto: <strong>{formatCurrency(descontoEfetivo)}</strong>
          </p>
          <p className="text-lg">
            Total: <strong>{formatCurrency(total)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${tenantSlug}/vendas`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Cancelar
          </Link>
          <SaveButton loading={pending} loadingText="Confirmando…" size="lg">
            Confirmar venda
          </SaveButton>
        </div>
      </div>
    </form>
  );
}
