"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  createClienteContatoAction,
  deleteClienteContatoAction,
  listClienteContatosAction,
} from "@/lib/crm/crm-corrections-actions";
import type { ClienteContatoRow } from "@/types/crm-enterprise";

type Props = {
  tenantSlug: string;
  clienteId: string;
};

export function ClienteContatosPanel({ tenantSlug, clienteId }: Props) {
  const [rows, setRows] = useState<ClienteContatoRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [principal, setPrincipal] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  function load() {
    startTransition(async () => {
      try {
        setError(null);
        const data = await listClienteContatosAction(tenantSlug, clienteId);
        setRows(data);
        setLoaded(true);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar contatos (migration pode estar pendente).",
        );
        setLoaded(true);
      }
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, clienteId]);

  function add() {
    startTransition(async () => {
      try {
        setError(null);
        await createClienteContatoAction(tenantSlug, clienteId, {
          nome,
          email,
          telefone,
          principal,
          ativo: true,
        });
        setNome("");
        setEmail("");
        setTelefone("");
        setPrincipal(false);
        const data = await listClienteContatosAction(tenantSlug, clienteId);
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao criar contato");
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Remover este contato?")) return;
    startTransition(async () => {
      try {
        setError(null);
        await deleteClienteContatoAction(tenantSlug, id);
        const data = await listClienteContatosAction(tenantSlug, clienteId);
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao remover contato");
      }
    });
  }

  return (
    <div className="space-y-4" aria-label="Contatos do cliente">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Contatos adicionais</h3>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={pending}>
          Recarregar
        </Button>
      </div>
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {!loaded ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
      {loaded && !rows.length && !error ? (
        <p className="text-sm text-muted-foreground">Nenhum contato adicional.</p>
      ) : null}
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div>
              <p className="font-medium">
                {r.nome}
                {r.principal ? " · principal" : ""}
                {!r.ativo ? " · inativo" : ""}
              </p>
              <p className="text-muted-foreground">
                {[r.cargo, r.email, r.telefone, r.whatsapp].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(r.id)}
              disabled={pending}
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
        <FormField label="Nome" htmlFor="contato-nome" required>
          <Input id="contato-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormField>
        <FormField label="E-mail" htmlFor="contato-email">
          <Input id="contato-email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Telefone" htmlFor="contato-tel">
          <Input id="contato-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) => setPrincipal(e.target.checked)}
          />
          Contato principal
        </label>
        <Button
          type="button"
          className="sm:col-span-2"
          onClick={add}
          disabled={pending || !nome.trim()}
        >
          Adicionar contato
        </Button>
      </div>
    </div>
  );
}
