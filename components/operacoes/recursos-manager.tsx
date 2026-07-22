"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import {
  createRecursoAction,
  removeRecursoAction,
  setRecursoStatusAction,
  updateRecursoAction,
} from "@/lib/operacoes/recursos-actions";
import type { OficinaRecurso } from "@/lib/operacoes/recursos-service";
import { cn } from "@/lib/utils";

const TIPOS = [
  { value: "elevador", label: "Elevador" },
  { value: "rampa", label: "Rampa" },
  { value: "box", label: "Box" },
  { value: "equipamento", label: "Equipamento" },
] as const;

type Props = {
  tenantSlug: string;
  recursos: OficinaRecurso[];
  centros: Array<{ id: string; nome: string }>;
};

const emptyForm = {
  nome: "",
  codigo: "",
  tipo: "elevador" as const,
  capacidade: "",
  centro_custo_id: "",
  observacoes: "",
  data_manutencao: "",
  proxima_manutencao: "",
};

export function RecursosManager({ tenantSlug, recursos, centros }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(r: OficinaRecurso) {
    setEditingId(r.id);
    setForm({
      nome: r.nome,
      codigo: r.codigo ?? "",
      tipo: (r.tipo as typeof emptyForm.tipo) || "elevador",
      capacidade: r.capacidade != null ? String(r.capacidade) : "",
      centro_custo_id: r.centroCustoId ?? "",
      observacoes: r.observacoes ?? "",
      data_manutencao: r.dataManutencao ?? "",
      proxima_manutencao: r.proximaManutencao ?? "",
    });
    setShowForm(true);
    setError(null);
  }

  function save() {
    setError(null);
    setSuccess(null);
    const payload = {
      nome: form.nome,
      codigo: form.codigo || null,
      tipo: form.tipo,
      capacidade: form.capacidade ? Number(form.capacidade) : null,
      centro_custo_id: form.centro_custo_id || null,
      observacoes: form.observacoes || null,
      data_manutencao: form.data_manutencao || null,
      proxima_manutencao: form.proxima_manutencao || null,
    };
    startTransition(async () => {
      const result = editingId
        ? await updateRecursoAction(tenantSlug, editingId, payload)
        : await createRecursoAction(tenantSlug, payload);
      if (!result.success) {
        setError(result.error ?? "Falha ao salvar.");
        return;
      }
      setSuccess(editingId ? "Recurso atualizado." : "Recurso cadastrado.");
      setShowForm(false);
      router.refresh();
    });
  }

  function runStatus(id: string, status: string) {
    startTransition(async () => {
      const result = await setRecursoStatusAction(tenantSlug, id, status);
      if (!result.success) setError(result.error ?? "Falha.");
      else router.refresh();
    });
  }

  function runRemove(id: string) {
    if (!window.confirm("Remover ou arquivar este recurso?")) return;
    startTransition(async () => {
      const result = await removeRecursoAction(tenantSlug, id);
      if (!result.success) {
        setError(result.error ?? "Falha.");
        return;
      }
      setSuccess(
        result.mode === "arquivado"
          ? "Recurso arquivado (já foi utilizado)."
          : "Recurso excluído.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {success ? (
        <FeedbackMessage variant="success">{success}</FeedbackMessage>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(buttonVariants())}
          onClick={openCreate}
        >
          Novo recurso
        </button>
      </div>

      {showForm ? (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">
            {editingId ? "Editar recurso" : "Cadastrar recurso"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Nome *</span>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Código</span>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.tipo}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo: e.target.value as typeof form.tipo,
                  })
                }
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Capacidade</span>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.capacidade}
                onChange={(e) =>
                  setForm({ ...form, capacidade: e.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Unidade</span>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.centro_custo_id}
                onChange={(e) =>
                  setForm({ ...form, centro_custo_id: e.target.value })
                }
              >
                <option value="">—</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Manutenção</span>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.data_manutencao}
                onChange={(e) =>
                  setForm({ ...form, data_manutencao: e.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Próxima manutenção</span>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.proxima_manutencao}
                onChange={(e) =>
                  setForm({ ...form, proxima_manutencao: e.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Observação</span>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3"
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !form.nome.trim()}
              className={cn(buttonVariants({ size: "sm" }))}
              onClick={save}
            >
              Salvar
            </button>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {recursos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum recurso cadastrado. Clique em &quot;Novo recurso&quot;.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recursos.map((r) => (
            <div key={r.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {r.nome}
                    {r.codigo ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({r.codigo})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {r.tipo} · {r.status}
                    {!r.ativo ? " · inativo" : ""}
                  </p>
                </div>
              </div>
              {r.ordemServicoId ? (
                <a
                  href={`/${tenantSlug}/ordens/${r.ordemServicoId}`}
                  className="text-xs underline"
                >
                  OS vinculada
                </a>
              ) : null}
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => openEdit(r)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => runStatus(r.id, "manutencao")}
                >
                  Manutenção
                </button>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => runStatus(r.id, "bloqueado")}
                >
                  Bloquear
                </button>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => runStatus(r.id, "disponivel")}
                >
                  Liberar
                </button>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "destructive", size: "sm" }),
                  )}
                  onClick={() => runRemove(r.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
