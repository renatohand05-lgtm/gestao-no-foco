"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  OsVeiculoPicker,
  useClienteVeiculos,
} from "@/components/ordens/os-veiculo-picker";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/ui/save-button";
import { createOrdemServicoAction } from "@/lib/ordens/actions";
import { cn } from "@/lib/utils";

type Option = { id: string; nome: string };

type Props = {
  tenantSlug: string;
  clientes: Option[];
};

export function OsOpenForm({ tenantSlug, clientes }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const {
    veiculos,
    error: veiculoError,
    loading: veiculoLoading,
    load,
  } = useClienteVeiculos(tenantSlug);

  function onSubmit(formData: FormData) {
    setError(null);
    if (!clienteId) {
      setError("Selecione o cliente.");
      return;
    }
    if (!veiculoId) {
      setError("Selecione ou cadastre um veículo.");
      return;
    }

    const values = {
      cliente_id: clienteId,
      veiculo_id: veiculoId,
      quilometragem_entrada: formData.get("quilometragem_entrada")
        ? Number(formData.get("quilometragem_entrada"))
        : null,
      reclamacao_cliente: String(formData.get("reclamacao_cliente") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      nivel_combustivel: String(formData.get("nivel_combustivel") ?? "") || null,
      objetos_deixados: String(formData.get("objetos_deixados") ?? "") || null,
      danos_aparentes: String(formData.get("danos_aparentes") ?? "") || null,
      origem_atendimento: String(formData.get("origem_atendimento") ?? "") || null,
      prioridade: String(formData.get("prioridade") ?? "normal"),
      previsao_entrega: String(formData.get("previsao_entrega") ?? "") || null,
    };

    startTransition(async () => {
      const result = await createOrdemServicoAction(tenantSlug, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/${tenantSlug}/ordens/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Cliente</span>
        <select
          required
          disabled={pending}
          value={clienteId}
          onChange={(e) => {
            const next = e.target.value;
            setClienteId(next);
            setVeiculoId("");
            load(next);
          }}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">Selecione…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Veículo do cliente</p>
        <OsVeiculoPicker
          tenantSlug={tenantSlug}
          clienteId={clienteId}
          value={veiculoId}
          onChange={setVeiculoId}
          veiculos={veiculos}
          loading={veiculoLoading}
          error={veiculoError}
          disabled={pending}
          onRefresh={(id) =>
            load(clienteId, id, (selected) => setVeiculoId(selected))
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Km entrada</span>
          <Input
            name="quilometragem_entrada"
            type="number"
            min={0}
            step="0.1"
            disabled={pending}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Previsão entrega</span>
          <Input name="previsao_entrega" type="datetime-local" disabled={pending} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Prioridade</span>
          <select
            name="prioridade"
            defaultValue="normal"
            disabled={pending}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Reclamação do cliente</span>
        <textarea
          name="reclamacao_cliente"
          rows={3}
          disabled={pending}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Nível de combustível</span>
          <Input name="nivel_combustivel" placeholder="1/4, 1/2…" disabled={pending} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Origem do atendimento</span>
          <Input name="origem_atendimento" disabled={pending} />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Objetos deixados</span>
        <Input name="objetos_deixados" disabled={pending} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Danos aparentes</span>
        <Input name="danos_aparentes" disabled={pending} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Observações</span>
        <textarea
          name="observacoes"
          rows={2}
          disabled={pending}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <SaveButton loading={pending}>Abrir OS</SaveButton>
        <Link
          href={`/${tenantSlug}/ordens`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
