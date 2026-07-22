"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createMecanicoAction,
  setMecanicoStatusAction,
} from "@/lib/mecanicos/actions";
import {
  MECANICO_ESPECIALIDADE_LABELS,
  MECANICO_ESPECIALIDADES,
  MECANICO_VINCULO_LABELS,
  MECANICO_VINCULOS,
  type MecanicoEspecialidade,
  type MecanicoVinculo,
} from "@/lib/mecanicos/constants";
import type { Mecanico } from "@/lib/mecanicos/mecanico-service";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  mecanicos: Mecanico[];
  canCreate: boolean;
  canEdit: boolean;
};

export function MecanicosManager({
  tenantSlug,
  mecanicos,
  canCreate,
  canEdit,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] =
    useState<MecanicoEspecialidade>("mecanica_geral");
  const [vinculo, setVinculo] = useState<MecanicoVinculo>("clt");
  const [codigo, setCodigo] = useState("");
  const [telefone, setTelefone] = useState("");

  function create() {
    if (!nome.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createMecanicoAction(tenantSlug, {
        nome_completo: nome,
        especialidade,
        tipo_vinculo: vinculo,
        codigo_interno: codigo || null,
        telefone: telefone || null,
      });
      if (!result.success) {
        setError(result.error ?? "Falha ao criar.");
        return;
      }
      setNome("");
      setCodigo("");
      setTelefone("");
      setShowForm(false);
      router.refresh();
    });
  }

  function setStatus(id: string, status: "ativo" | "inativo" | "arquivado") {
    setError(null);
    startTransition(async () => {
      const result = await setMecanicoStatusAction(tenantSlug, id, status);
      if (!result.success) {
        setError(result.error ?? "Falha.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {mecanicos.length} mecânico(s)
        </p>
        {canCreate ? (
          <button
            type="button"
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancelar" : "Novo mecânico"}
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Nome completo</span>
              <input
                className="h-9 w-full rounded-md border border-input bg-transparent px-2"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Código interno</span>
              <input
                className="h-9 w-full rounded-md border border-input bg-transparent px-2"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Especialidade</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2"
                value={especialidade}
                onChange={(e) =>
                  setEspecialidade(e.target.value as MecanicoEspecialidade)
                }
              >
                {MECANICO_ESPECIALIDADES.map((e) => (
                  <option key={e} value={e}>
                    {MECANICO_ESPECIALIDADE_LABELS[e]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Vínculo</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2"
                value={vinculo}
                onChange={(e) => setVinculo(e.target.value as MecanicoVinculo)}
              >
                {MECANICO_VINCULOS.map((v) => (
                  <option key={v} value={v}>
                    {MECANICO_VINCULO_LABELS[v]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Telefone</span>
              <input
                className="h-9 w-full rounded-md border border-input bg-transparent px-2"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={create}
          >
            Salvar
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Especialidade</th>
              <th className="px-3 py-2">Vínculo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Disponibilidade</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {mecanicos.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/${tenantSlug}/oficina/mecanicos/${m.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {m.nome_completo}
                  </Link>
                  {m.codigo_interno ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {m.codigo_interno}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {MECANICO_ESPECIALIDADE_LABELS[m.especialidade] ??
                    m.especialidade}
                </td>
                <td className="px-3 py-2">
                  {MECANICO_VINCULO_LABELS[m.tipo_vinculo] ?? m.tipo_vinculo}
                </td>
                <td className="px-3 py-2 capitalize">{m.status}</td>
                <td className="px-3 py-2 capitalize">{m.disponibilidade}</td>
                <td className="px-3 py-2 text-right space-x-1">
                  {canEdit && m.status === "ativo" ? (
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      onClick={() => setStatus(m.id, "inativo")}
                    >
                      Inativar
                    </button>
                  ) : null}
                  {canEdit && m.status === "inativo" ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        onClick={() => setStatus(m.id, "ativo")}
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        onClick={() => setStatus(m.id, "arquivado")}
                      >
                        Arquivar
                      </button>
                    </>
                  ) : null}
                  {canEdit && m.status === "arquivado" ? (
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      onClick={() => setStatus(m.id, "ativo")}
                    >
                      Restaurar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {mecanicos.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Nenhum mecânico cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
