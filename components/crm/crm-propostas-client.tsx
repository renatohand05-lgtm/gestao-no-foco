"use client";

import { useState, useTransition } from "react";
import { Plus, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { searchClientesAction } from "@/lib/crm/sequence-actions";
import {
  createPropostaAction,
  listPropostasAction,
  sendPropostaAction,
} from "@/lib/crm/proposta-actions";
import type { ClienteSearchResult } from "@/lib/crm/sequence-service";
import type {
  Proposta,
  PropostaItemInput,
} from "@/lib/crm/proposta-service";

type Props = {
  tenantSlug: string;
  initialPropostas: Proposta[];
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function emptyItem(): PropostaItemInput {
  return { descricao: "", quantidade: 1, valorUnitario: 0 };
}

const STATUS_LABEL: Record<Proposta["status"], string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
};

export function CrmPropostasClient({ tenantSlug, initialPropostas }: Props) {
  const [propostas, setPropostas] = useState(initialPropostas);
  const [creating, setCreating] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResults, setClienteResults] = useState<ClienteSearchResult[]>([]);
  const [cliente, setCliente] = useState<ClienteSearchResult | null>(null);
  const [condicoes, setCondicoes] = useState("");
  const [itens, setItens] = useState<PropostaItemInput[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [sendTarget, setSendTarget] = useState<Proposta | null>(null);
  const [sendCanal, setSendCanal] = useState<"whatsapp" | "email">("whatsapp");
  const [sendDestino, setSendDestino] = useState("");
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  async function reload() {
    const result = await listPropostasAction(tenantSlug);
    if (result.success) setPropostas(result.data);
  }

  function handleClienteSearch(q: string) {
    setClienteQuery(q);
    setCliente(null);
    if (q.trim().length < 2) {
      setClienteResults([]);
      return;
    }
    startTransition(async () => {
      const result = await searchClientesAction(tenantSlug, q);
      if (result.success) setClienteResults(result.data);
    });
  }

  function updateItem(index: number, patch: Partial<PropostaItemInput>) {
    setItens((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItens((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  const total = itens.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0);

  function handleCreate() {
    setError(null);
    if (!cliente) {
      setError("Escolha um cliente.");
      return;
    }
    if (!titulo.trim()) {
      setError("Dê um título pra proposta.");
      return;
    }
    if (itens.some((i) => !i.descricao.trim() || i.valorUnitario <= 0)) {
      setError("Preencha descrição e valor de todos os itens.");
      return;
    }
    startTransition(async () => {
      const result = await createPropostaAction(tenantSlug, {
        clienteId: cliente.id,
        titulo,
        itens,
        condicoesPagamento: condicoes || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTitulo("");
      setCliente(null);
      setClienteQuery("");
      setCondicoes("");
      setItens([emptyItem()]);
      setCreating(false);
      void reload();
    });
  }

  function openSend(p: Proposta) {
    setSendTarget(p);
    setSendCanal("whatsapp");
    setSendDestino("");
    setSendMsg(null);
  }

  function handleSend() {
    if (!sendTarget) return;
    setSendMsg(null);
    startTransition(async () => {
      const result = await sendPropostaAction(tenantSlug, sendTarget.id, {
        canal: sendCanal,
        destino: sendDestino || undefined,
      });
      if (!result.success) {
        setSendMsg(result.error);
        return;
      }
      setSendMsg("Enviada com sucesso!");
      void reload();
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Propostas comerciais"
        description="Gere uma proposta em PDF a partir dos itens, e envie por WhatsApp ou e-mail direto pro cliente."
      >
        <div className="space-y-4">
          {!creating ? (
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus className="mr-2 size-4" />
              Nova proposta
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-border/60 p-4">
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da proposta"
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
              />

              <div className="space-y-1">
                <input
                  type="text"
                  value={cliente ? cliente.nome : clienteQuery}
                  onChange={(e) => handleClienteSearch(e.target.value)}
                  placeholder="Buscar cliente pelo nome…"
                  className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                />
                {!cliente && clienteResults.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {clienteResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCliente(c);
                          setClienteResults([]);
                        }}
                        className="rounded-full border border-border/60 px-2.5 py-1 text-xs"
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {itens.map((item, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={item.descricao}
                    onChange={(e) => updateItem(i, { descricao: e.target.value })}
                    placeholder="Descrição do item"
                    className="h-8 flex-1 rounded-md border border-border/60 bg-background px-3 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => updateItem(i, { quantidade: Number(e.target.value) })}
                    className="h-8 w-16 rounded-md border border-border/60 bg-background px-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.valorUnitario}
                    onChange={(e) =>
                      updateItem(i, { valorUnitario: Number(e.target.value) })
                    }
                    className="h-8 w-24 rounded-md border border-border/60 bg-background px-2 text-sm"
                  />
                  {itens.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 size-3.5" />
                Adicionar item
              </Button>

              <input
                type="text"
                value={condicoes}
                onChange={(e) => setCondicoes(e.target.value)}
                placeholder="Condições de pagamento (opcional)"
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
              />

              <p className="text-sm font-medium">Total: {formatCurrency(total)}</p>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="button" onClick={handleCreate} disabled={isPending}>
                  {isPending ? "Salvando…" : "Salvar proposta"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {propostas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma proposta criada ainda.
              </p>
            ) : (
              propostas.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border/60 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.clienteNome} · {formatCurrency(p.valorTotal)} ·{" "}
                      {STATUS_LABEL[p.status]}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => openSend(p)}>
                    <Send className="mr-1 size-3.5" />
                    Enviar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      <Dialog open={sendTarget !== null} onOpenChange={(open) => !open && setSendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <NativeSelect
              value={sendCanal}
              onChange={(e) => setSendCanal(e.target.value as "whatsapp" | "email")}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
            </NativeSelect>
            <input
              type="text"
              value={sendDestino}
              onChange={(e) => setSendDestino(e.target.value)}
              placeholder={
                sendCanal === "whatsapp" ? "(11) 99999-9999" : "cliente@email.com"
              }
              className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
            />
            {sendMsg ? <p className="text-sm">{sendMsg}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSend} disabled={isPending}>
              {isPending ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
