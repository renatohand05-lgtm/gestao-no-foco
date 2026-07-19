"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { useOptionalToast } from "@/components/platform/toast-provider";
import {
  processNfeImportAction,
  updateNfeHeaderAction,
  updateNfeItemAction,
} from "@/lib/nfe/actions";
import { cn } from "@/lib/utils";
import type { NfeDestino, NfeEntradaDetail } from "@/types/nfe-entrada";

type Option = { id: string; label: string };

type Props = {
  tenantSlug: string;
  nota: NfeEntradaDetail;
  fornecedores: Option[];
  produtos: Option[];
  ordens: Option[];
  categorias: Option[];
  planos: Option[];
  centros: Option[];
};

export function NfeConferenciaClient({
  tenantSlug,
  nota,
  fornecedores,
  produtos,
  ordens,
  categorias,
  planos,
  centros,
}: Props) {
  const router = useRouter();
  const toast = useOptionalToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [gerarCp, setGerarCp] = useState(nota.gerar_conta_pagar);

  const resumo = useMemo(() => {
    const vinculados = nota.itens.filter((i) => i.produto_id).length;
    const pendentes = nota.itens.filter(
      (i) => i.destino === "pendente" || (!i.produto_id && !["ignorar", "despesa"].includes(i.destino)),
    ).length;
    const valorEstoque = nota.itens
      .filter((i) => i.destino === "estoque" || i.destino === "misto")
      .reduce(
        (s, i) =>
          s +
          (i.quantidade > 0
            ? (i.custo_total_final * i.quantidade_estoque) / i.quantidade
            : 0),
        0,
      );
    const valorOs = nota.itens
      .filter((i) => i.destino === "os" || i.destino === "misto")
      .reduce(
        (s, i) =>
          s +
          (i.quantidade > 0
            ? (i.custo_total_final * i.quantidade_os) / i.quantidade
            : 0),
        0,
      );
    return { vinculados, pendentes, valorEstoque, valorOs };
  }, [nota.itens]);

  const canImport =
    Boolean(nota.fornecedor_id) &&
    nota.itens.every((i) => i.destino !== "pendente") &&
    nota.status !== "importada";

  function run(fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setError(result.error ?? "Falha");
        toast?.error(result.error ?? "Falha");
        return;
      }
      toast?.success(okMsg);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? <FeedbackMessage>{error}</FeedbackMessage> : null}
      {nota.erro_mensagem ? (
        <FeedbackMessage variant="warning">
          Último erro: {nota.erro_mensagem}
        </FeedbackMessage>
      ) : null}

      <SectionCard title="Cabeçalho da NF-e" contentClassName="pt-0 space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Emitente:</span>{" "}
            {nota.emitente_razao_social ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">CNPJ/CPF:</span>{" "}
            {nota.emitente_cnpj_cpf ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Número/Série:</span>{" "}
            {nota.numero ?? "—"} / {nota.serie ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Emissão:</span>{" "}
            {nota.data_emissao ?? "—"}
          </p>
          <p className="sm:col-span-2 break-all">
            <span className="text-muted-foreground">Chave:</span> {nota.chave_acesso}
          </p>
          <p>
            <span className="text-muted-foreground">Total:</span>{" "}
            {nota.valor_total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span> {nota.status}
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-muted-foreground">Fornecedor no ERP</span>
          <select
            className="h-10 w-full rounded-md border px-3"
            defaultValue={nota.fornecedor_id ?? ""}
            disabled={pending || nota.status === "importada"}
            onChange={(e) =>
              run(
                () =>
                  updateNfeHeaderAction(tenantSlug, nota.id, {
                    fornecedor_id: e.target.value || null,
                  }),
                "Fornecedor atualizado",
              )
            }
          >
            <option value="">Selecione / confirme</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <FeedbackMessage variant="info">
          Matching por CNPJ/CPF normalizado. Nunca vincule só por nome sem confirmação.
        </FeedbackMessage>
      </SectionCard>

      <SectionCard title="Resumo" contentClassName="pt-0 text-sm">
        <ul className="grid gap-2 sm:grid-cols-2">
          <li>Itens: {nota.itens.length}</li>
          <li>Produtos vinculados: {resumo.vinculados}</li>
          <li>Pendências: {resumo.pendentes}</li>
          <li>
            Destinado estoque:{" "}
            {resumo.valorEstoque.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </li>
          <li>
            Destinado OS:{" "}
            {resumo.valorOs.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </li>
          <li>
            Conta a Pagar: {gerarCp ? "sim (aberta, sem baixa)" : "não"}
          </li>
        </ul>
        <FeedbackMessage variant="warning" className="mt-3">
          Política de custo: estoque usa <strong>custo médio ponderado</strong>;
          OS direta usa o <strong>custo real da NF-e</strong> (sem alterar o médio).
          Frete, seguro, despesas e descontos já entram no rateio unitário.
        </FeedbackMessage>
      </SectionCard>

      <SectionCard title="Itens" contentClassName="pt-0 overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Descrição</th>
              <th className="py-2 pr-2">Qtd</th>
              <th className="py-2 pr-2">Custo final</th>
              <th className="py-2 pr-2">Produto ERP</th>
              <th className="py-2 pr-2">Destino</th>
              <th className="py-2 pr-2">Qtd estoque</th>
              <th className="py-2 pr-2">Qtd OS</th>
              <th className="py-2 pr-2">OS</th>
            </tr>
          </thead>
          <tbody>
            {nota.itens.map((item) => (
              <tr key={item.id} className="border-b align-top">
                <td className="py-2 pr-2">{item.numero_item}</td>
                <td className="py-2 pr-2">
                  <p className="font-medium">{item.descricao_original}</p>
                  <p className="text-xs text-muted-foreground">
                    cod {item.codigo_fornecedor ?? "—"} · EAN {item.ean ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    custo ant. ERP:{" "}
                    {item.custo_produto_atual != null
                      ? item.custo_produto_atual.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "—"}{" "}
                    → nota{" "}
                    {item.custo_unitario_final.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </td>
                <td className="py-2 pr-2 tabular-nums">{item.quantidade}</td>
                <td className="py-2 pr-2 tabular-nums">
                  {item.custo_total_final.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="py-2 pr-2">
                  <select
                    className="h-9 w-44 rounded-md border px-2"
                    defaultValue={item.produto_id ?? ""}
                    disabled={pending || nota.status === "importada"}
                    onChange={(e) =>
                      run(
                        () =>
                          updateNfeItemAction(tenantSlug, nota.id, item.id, {
                            produto_id: e.target.value || null,
                          }),
                        "Produto vinculado",
                      )
                    }
                  >
                    <option value="">Pendente</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <select
                    className="h-9 w-32 rounded-md border px-2"
                    defaultValue={item.destino}
                    disabled={pending || nota.status === "importada"}
                    onChange={(e) =>
                      run(
                        () =>
                          updateNfeItemAction(tenantSlug, nota.id, item.id, {
                            destino: e.target.value as NfeDestino,
                          }),
                        "Destino atualizado",
                      )
                    }
                  >
                    <option value="pendente">Pendente</option>
                    <option value="estoque">Estoque</option>
                    <option value="os">OS</option>
                    <option value="misto">Misto</option>
                    <option value="despesa">Despesa</option>
                    <option value="ignorar">Ignorar</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    className="h-9 w-24 rounded-md border px-2"
                    defaultValue={item.quantidade_estoque}
                    disabled={
                      pending ||
                      nota.status === "importada" ||
                      item.destino !== "misto"
                    }
                    onBlur={(e) => {
                      if (item.destino !== "misto") return;
                      run(
                        () =>
                          updateNfeItemAction(tenantSlug, nota.id, item.id, {
                            destino: "misto",
                            quantidade_estoque: Number(e.target.value),
                            quantidade_os: item.quantidade_os,
                          }),
                        "Quantidades atualizadas",
                      );
                    }}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    className="h-9 w-24 rounded-md border px-2"
                    defaultValue={item.quantidade_os}
                    disabled={
                      pending ||
                      nota.status === "importada" ||
                      item.destino !== "misto"
                    }
                    onBlur={(e) => {
                      if (item.destino !== "misto") return;
                      run(
                        () =>
                          updateNfeItemAction(tenantSlug, nota.id, item.id, {
                            destino: "misto",
                            quantidade_estoque: item.quantidade_estoque,
                            quantidade_os: Number(e.target.value),
                          }),
                        "Quantidades atualizadas",
                      );
                    }}
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    className="h-9 w-40 rounded-md border px-2"
                    defaultValue={item.ordem_servico_id ?? ""}
                    disabled={
                      pending ||
                      nota.status === "importada" ||
                      !["os", "misto"].includes(item.destino)
                    }
                    onChange={(e) =>
                      run(
                        () =>
                          updateNfeItemAction(tenantSlug, nota.id, item.id, {
                            ordem_servico_id: e.target.value || null,
                            destino: item.destino,
                          }),
                        "OS selecionada",
                      )
                    }
                  >
                    <option value="">—</option>
                    {ordens.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Gate 1: 1 OS por item
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Conta a Pagar" contentClassName="pt-0 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={gerarCp}
            disabled={pending || nota.status === "importada"}
            onChange={(e) => {
              setGerarCp(e.target.checked);
              run(
                () =>
                  updateNfeHeaderAction(tenantSlug, nota.id, {
                    gerar_conta_pagar: e.target.checked,
                  }),
                "Opção Conta a Pagar atualizada",
              );
            }}
          />
          Gerar Conta a Pagar (não paga; sem movimento bancário)
        </label>
        {gerarCp ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="h-10 rounded-md border px-3 text-sm"
              defaultValue={nota.categoria_financeira_id ?? ""}
              disabled={pending}
              onChange={(e) =>
                run(
                  () =>
                    updateNfeHeaderAction(tenantSlug, nota.id, {
                      categoria_financeira_id: e.target.value || null,
                    }),
                  "Categoria salva",
                )
              }
            >
              <option value="">Categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border px-3 text-sm"
              defaultValue={nota.plano_conta_id ?? ""}
              disabled={pending}
              onChange={(e) =>
                run(
                  () =>
                    updateNfeHeaderAction(tenantSlug, nota.id, {
                      plano_conta_id: e.target.value || null,
                    }),
                  "Plano salvo",
                )
              }
            >
              <option value="">Plano de contas</option>
              {planos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border px-3 text-sm"
              defaultValue={nota.centro_custo_id ?? ""}
              disabled={pending}
              onChange={(e) =>
                run(
                  () =>
                    updateNfeHeaderAction(tenantSlug, nota.id, {
                      centro_custo_id: e.target.value || null,
                    }),
                  "Centro salvo",
                )
              }
            >
              <option value="">Centro de custo</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </SectionCard>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/${tenantSlug}/estoque/notas-fiscais/${nota.id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Ver histórico
        </Link>
        <button
          type="button"
          disabled={pending || !canImport}
          className={cn(buttonVariants())}
          onClick={() =>
            run(async () => {
              const r = await processNfeImportAction(tenantSlug, nota.id);
              if (r.success) {
                router.push(`/${tenantSlug}/estoque/notas-fiscais/${nota.id}`);
              }
              return r;
            }, "Importação concluída")
          }
        >
          {pending ? "Importando…" : "Importar"}
        </button>
        {!canImport ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Importar bloqueado enquanto houver pendências críticas.
          </p>
        ) : null}
      </div>
    </div>
  );
}
