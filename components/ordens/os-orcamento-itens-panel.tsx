"use client";

import { useMemo, useState, useTransition } from "react";

import {
  OsItemCatalogPicker,
  type CatalogoItem,
} from "@/components/ordens/os-item-catalog-picker";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import {
  addOsItemAction,
  converterOsItemPersonalizadoAction,
  previewPersonalizadoOsAction,
  removeOsItemAction,
  updateOsItemAction,
} from "@/lib/ordens/actions";
import { formatCurrency } from "@/lib/format";
import type { OrdemServicoDetail } from "@/lib/ordens/ordem-servico-service";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  os: OrdemServicoDetail;
  canEdit: boolean;
  canAddPersonalizado: boolean;
  canConvertPersonalizado: boolean;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
};

export function OsOrcamentoItensPanel({
  tenantSlug,
  os,
  canEdit,
  canAddPersonalizado,
  canConvertPersonalizado,
  onDone,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showPersonalizado, setShowPersonalizado] = useState(false);
  const [catalog, setCatalog] = useState<CatalogoItem | null>(null);
  const [qty, setQty] = useState(1);
  const [vu, setVu] = useState(0);
  const [custo, setCusto] = useState<number | "">("");
  const [desconto, setDesconto] = useState(0);
  const acrescimo = 0;
  const [pecaOrigem, setPecaOrigem] = useState("estoque");
  const horas: number | "" = "";

  const [pTipo, setPTipo] = useState<"produto" | "servico">("servico");
  const [pDesc, setPDesc] = useState("");
  const [pQty, setPQty] = useState(1);
  const [pVu, setPVu] = useState(0);
  const [pCusto, setPCusto] = useState<number | "">("");
  const [pObs, setPObs] = useState("");
  const [pMotivo, setPMotivo] = useState("");
  const [pAlerts, setPAlerts] = useState<string[]>([]);
  const [convertFor, setConvertFor] = useState<string | null>(null);
  const [convertProd, setConvertProd] = useState<CatalogoItem | null>(null);

  const produtos = useMemo(
    () => os.itens.filter((i) => i.tipo_item === "produto" && !i.is_personalizado),
    [os.itens],
  );
  const servicos = useMemo(
    () => os.itens.filter((i) => i.tipo_item === "servico" && !i.is_personalizado),
    [os.itens],
  );
  const personalizados = useMemo(
    () => os.itens.filter((i) => i.is_personalizado),
    [os.itens],
  );

  function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        onError(res.error ?? "Erro");
        return;
      }
      onDone(ok);
    });
  }

  function onCatalogSelect(item: CatalogoItem) {
    if (!item.id) {
      setCatalog(null);
      return;
    }
    setCatalog(item);
    setVu(item.preco_venda);
    setCusto(item.custo ?? "");
  }

  async function refreshPersonalizadoAlerts(desc: string) {
    if (desc.trim().length < 3) {
      setPAlerts([]);
      return;
    }
    const res = await previewPersonalizadoOsAction(tenantSlug, desc);
    if (!res.success) return;
    const alerts: string[] = [];
    if (res.semelhantes.length) {
      alerts.push(
        `Semelhante a cadastro: ${res.semelhantes.map((s) => s.nome).join(", ")}`,
      );
    }
    if (res.recorrencia >= 2) {
      alerts.push(
        `Este item foi usado ${res.recorrencia} vezes como personalizado. Considere cadastrar definitivamente.`,
      );
    }
    setPAlerts(alerts);
  }

  function renderItemList(
    title: string,
    items: OrdemServicoDetail["itens"],
    badge?: string,
  ) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {title}{" "}
          <span className="text-muted-foreground">({items.length})</span>
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "space-y-2 rounded-lg border px-3 py-2 text-sm",
                  item.is_personalizado &&
                    "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {item.descricao}
                      {badge || item.is_personalizado ? (
                        <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                          {badge ?? "Personalizado"}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.categoria_item} · qtd {item.quantidade} ·{" "}
                      {formatCurrency(item.valor_unitario)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="tabular-nums font-semibold">
                      {formatCurrency(item.valor_total)}
                    </p>
                    {canEdit && item.aprovacao_status === "pendente" ? (
                      <>
                        {item.is_personalizado && canConvertPersonalizado ? (
                          <button
                            type="button"
                            disabled={pending}
                            className={cn(
                              buttonVariants({ variant: "secondary", size: "sm" }),
                            )}
                            onClick={() =>
                              setConvertFor(
                                convertFor === item.id ? null : item.id,
                              )
                            }
                          >
                            Converter
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                          )}
                          onClick={() =>
                            setEditingItemId(
                              editingItemId === item.id ? null : item.id,
                            )
                          }
                        >
                          {editingItemId === item.id ? "Fechar" : "Editar"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            buttonVariants({
                              variant: "destructive",
                              size: "sm",
                            }),
                          )}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Remover "${item.descricao}" do orçamento?`,
                              )
                            ) {
                              return;
                            }
                            run(
                              () =>
                                removeOsItemAction(tenantSlug, os.id, item.id),
                              "Item removido.",
                            );
                          }}
                        >
                          Remover
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {convertFor === item.id ? (
                  <div className="space-y-2 border-t pt-2">
                    <OsItemCatalogPicker
                      tenantSlug={tenantSlug}
                      tipo="all"
                      value={convertProd?.id ?? ""}
                      onSelect={setConvertProd}
                      disabled={pending}
                      label="Vincular a cadastro existente"
                    />
                    <button
                      type="button"
                      disabled={pending || !convertProd?.id}
                      className={cn(buttonVariants({ size: "sm" }))}
                      onClick={() => {
                        if (!convertProd?.id) return;
                        run(
                          () =>
                            converterOsItemPersonalizadoAction(
                              tenantSlug,
                              os.id,
                              item.id,
                              {
                                produto_id: convertProd.id,
                                motivo: "Conversão para item cadastrado",
                              },
                            ),
                          "Item convertido para cadastro.",
                        );
                        setConvertFor(null);
                        setConvertProd(null);
                      }}
                    >
                      Confirmar conversão
                    </button>
                  </div>
                ) : null}

                {editingItemId === item.id ? (
                  <form
                    className="space-y-2 border-t pt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      run(
                        () =>
                          updateOsItemAction(tenantSlug, os.id, item.id, {
                            produto_id: item.produto_id ?? undefined,
                            descricao: String(fd.get("descricao") || ""),
                            tipo_item: item.tipo_item,
                            categoria_item: item.categoria_item,
                            quantidade: Number(fd.get("quantidade") || 1),
                            valor_unitario: Number(
                              fd.get("valor_unitario") || 0,
                            ),
                            desconto: Number(fd.get("desconto") || 0),
                            acrescimo: Number(fd.get("acrescimo") || 0),
                            peca_origem: item.peca_origem,
                            is_personalizado: item.is_personalizado,
                            horas_previstas: fd.get("horas_previstas")
                              ? Number(fd.get("horas_previstas"))
                              : null,
                          }),
                        "Item atualizado.",
                      );
                      setEditingItemId(null);
                    }}
                  >
                    <Input
                      name="descricao"
                      required
                      defaultValue={item.descricao}
                      disabled={pending || !item.is_personalizado}
                    />
                    <div className="grid gap-2 md:grid-cols-4">
                      <Input
                        name="quantidade"
                        type="number"
                        step="0.001"
                        defaultValue={item.quantidade}
                        disabled={pending}
                      />
                      <Input
                        name="valor_unitario"
                        type="number"
                        step="0.01"
                        defaultValue={item.valor_unitario}
                        disabled={pending}
                      />
                      <Input
                        name="desconto"
                        type="number"
                        step="0.01"
                        defaultValue={item.desconto}
                        disabled={pending}
                      />
                      <Input
                        name="horas_previstas"
                        type="number"
                        step="0.1"
                        defaultValue={item.horas_previstas ?? ""}
                        disabled={pending}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pending}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      Salvar
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderItemList("Produtos cadastrados", produtos)}
      {renderItemList("Serviços cadastrados", servicos)}
      {renderItemList("Itens personalizados", personalizados, "Personalizado")}

      {canEdit ? (
        <div className="space-y-3 rounded-xl border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Adicionar produto ou serviço cadastrado
          </p>
          <OsItemCatalogPicker
            tenantSlug={tenantSlug}
            value={catalog?.id ?? ""}
            onSelect={onCatalogSelect}
            disabled={pending}
          />
          {catalog?.id ? (
            <div className="grid gap-2 md:grid-cols-4">
              <Input
                type="number"
                step="0.001"
                min={0.001}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
                disabled={pending}
                placeholder="Qtd"
              />
              <Input
                type="number"
                step="0.01"
                min={0}
                value={vu}
                onChange={(e) => setVu(Number(e.target.value) || 0)}
                disabled={pending}
                placeholder="Valor unit."
              />
              <Input
                type="number"
                step="0.01"
                min={0}
                value={desconto}
                onChange={(e) => setDesconto(Number(e.target.value) || 0)}
                disabled={pending}
                placeholder="Desconto"
              />
              <select
                value={pecaOrigem}
                onChange={(e) => setPecaOrigem(e.target.value)}
                disabled={pending}
                className="h-10 rounded-md border px-2 text-sm"
              >
                <option value="estoque">Estoque</option>
                <option value="cliente">Cliente</option>
                <option value="compra">Compra</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          ) : null}
          <button
            type="button"
            disabled={pending || !catalog?.id}
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => {
              if (!catalog?.id) return;
              const isServico =
                catalog.tipo === "servico" || catalog.tipo === "serviço";
              run(
                () =>
                  addOsItemAction(tenantSlug, os.id, {
                    produto_id: catalog.id,
                    descricao: catalog.nome,
                    tipo_item: isServico ? "servico" : "produto",
                    categoria_item: isServico ? "servico" : "peca",
                    quantidade: qty,
                    valor_unitario: vu,
                    desconto,
                    acrescimo,
                    custo_unitario: custo === "" ? null : Number(custo),
                    peca_origem: isServico ? "outro" : pecaOrigem,
                    horas_previstas: horas === "" ? null : Number(horas),
                    is_personalizado: false,
                  }),
                "Item cadastrado incluído.",
              );
              setCatalog(null);
              setQty(1);
              setVu(0);
            }}
          >
            Incluir no orçamento
          </button>
        </div>
      ) : null}

      {canEdit && canAddPersonalizado ? (
        <div className="space-y-3 rounded-xl border border-amber-300/60 p-3 dark:border-amber-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Adicionar item personalizado</p>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              onClick={() => setShowPersonalizado((v) => !v)}
            >
              {showPersonalizado ? "Fechar" : "Abrir formulário"}
            </button>
          </div>
          {showPersonalizado ? (
            <div className="space-y-2">
              {pAlerts.length ? (
                <FeedbackMessage variant="warning">
                  {pAlerts.join(" · ")}
                </FeedbackMessage>
              ) : null}
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  value={pTipo}
                  onChange={(e) =>
                    setPTipo(e.target.value as "produto" | "servico")
                  }
                  className="h-10 rounded-md border px-2 text-sm"
                  disabled={pending}
                >
                  <option value="servico">Serviço personalizado</option>
                  <option value="produto">Produto personalizado</option>
                </select>
                <Input
                  value={pDesc}
                  onChange={(e) => {
                    setPDesc(e.target.value);
                    void refreshPersonalizadoAlerts(e.target.value);
                  }}
                  placeholder="Descrição *"
                  disabled={pending}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  type="number"
                  step="0.001"
                  min={0.001}
                  value={pQty}
                  onChange={(e) => setPQty(Number(e.target.value) || 1)}
                  placeholder={pTipo === "servico" ? "Qtd / horas" : "Qtd"}
                  disabled={pending}
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={pVu}
                  onChange={(e) => setPVu(Number(e.target.value) || 0)}
                  placeholder="Valor unitário"
                  disabled={pending}
                />
                {pTipo === "produto" ? (
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={pCusto}
                    onChange={(e) =>
                      setPCusto(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Custo (opc.)"
                    disabled={pending}
                  />
                ) : (
                  <Input
                    value={pObs}
                    onChange={(e) => setPObs(e.target.value)}
                    placeholder="Observação"
                    disabled={pending}
                  />
                )}
                <Input
                  value={pMotivo}
                  onChange={(e) => setPMotivo(e.target.value)}
                  placeholder="Motivo *"
                  disabled={pending}
                />
              </div>
              <button
                type="button"
                disabled={pending || !pDesc.trim() || pQty <= 0 || pVu < 0}
                className={cn(buttonVariants({ size: "sm" }))}
                onClick={() => {
                  if (!pMotivo.trim()) {
                    onError("Informe o motivo do item personalizado.");
                    return;
                  }
                  run(
                    () =>
                      addOsItemAction(tenantSlug, os.id, {
                        descricao: pDesc.trim(),
                        tipo_item: pTipo,
                        categoria_item:
                          pTipo === "produto" ? "peca" : "servico",
                        quantidade: pQty,
                        valor_unitario: pVu,
                        desconto: 0,
                        acrescimo: 0,
                        custo_unitario:
                          pCusto === "" ? null : Number(pCusto),
                        peca_origem: "outro",
                        observacoes: pObs || null,
                        is_personalizado: true,
                        personalizado_motivo: pMotivo.trim(),
                        horas_previstas:
                          pTipo === "servico" ? pQty : null,
                      }),
                    "Item personalizado adicionado.",
                  );
                  setPDesc("");
                  setPQty(1);
                  setPVu(0);
                  setPCusto("");
                  setPObs("");
                  setPMotivo("");
                  setPAlerts([]);
                  setShowPersonalizado(false);
                }}
              >
                Salvar personalizado
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
