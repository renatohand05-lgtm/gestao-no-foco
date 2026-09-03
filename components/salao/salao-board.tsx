"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createMesaAction,
  deleteMesaAction,
  linkComandaToMesaAction,
  releaseMesaAction,
  updateMesaStatusAction,
} from "@/lib/restaurante/mesas-actions";
import type { Mesa, MesaStatus, OpenComanda } from "@/lib/restaurante/mesas";

const STATUS_LABEL: Record<MesaStatus, string> = {
  livre: "Livre",
  ocupada: "Ocupada",
  reservada: "Reservada",
  limpeza: "Limpeza",
};

const STATUS_BADGE_VARIANT: Record<MesaStatus, "success" | "destructive" | "warning" | "outline"> = {
  livre: "success",
  ocupada: "destructive",
  reservada: "warning",
  limpeza: "outline",
};

type Props = {
  tenantSlug: string;
  initialMesas: Mesa[];
  initialComandas: OpenComanda[];
  loadError: string | null;
};

export function SalaoBoard({
  tenantSlug,
  initialMesas,
  initialComandas,
  loadError,
}: Props) {
  const [mesas, setMesas] = useState(initialMesas);
  const [comandas] = useState(initialComandas);
  const [expandedMesaId, setExpandedMesaId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(loadError);

  const [novoNumero, setNovoNumero] = useState("");
  const [novaCapacidade, setNovaCapacidade] = useState("");
  const [showNovaMesa, setShowNovaMesa] = useState(false);

  function comandaLabel(id: string | null): string {
    if (!id) return "";
    const c = comandas.find((c) => c.id === id);
    return c ? `Comanda #${c.numero}` : "Comanda vinculada";
  }

  function onCreateMesa() {
    setError(null);
    if (!novoNumero.trim()) {
      setError("Informe o número/nome da mesa.");
      return;
    }
    startTransition(async () => {
      const res = await createMesaAction(tenantSlug, {
        numero: novoNumero.trim(),
        capacidade: novaCapacidade ? Number(novaCapacidade) : null,
        observacoes: null,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setNovoNumero("");
      setNovaCapacidade("");
      setShowNovaMesa(false);
      // Recarrega via reload simples da lista local — próxima navegação já traz do servidor.
      window.location.reload();
    });
  }

  function onChangeStatus(mesaId: string, status: MesaStatus) {
    setError(null);
    setMesas((prev) =>
      prev.map((m) => (m.id === mesaId ? { ...m, status } : m)),
    );
    startTransition(async () => {
      const res = await updateMesaStatusAction(tenantSlug, { mesaId, status });
      if (!res.success) setError(res.error);
    });
  }

  function onLinkComanda(mesaId: string, ordemServicoId: string) {
    if (!ordemServicoId) return;
    setError(null);
    setMesas((prev) =>
      prev.map((m) =>
        m.id === mesaId
          ? { ...m, status: "ocupada", ordemServicoId }
          : m,
      ),
    );
    startTransition(async () => {
      const res = await linkComandaToMesaAction(tenantSlug, {
        mesaId,
        ordemServicoId,
      });
      if (!res.success) setError(res.error);
    });
  }

  function onRelease(mesaId: string) {
    setError(null);
    setMesas((prev) =>
      prev.map((m) =>
        m.id === mesaId ? { ...m, status: "livre", ordemServicoId: null } : m,
      ),
    );
    startTransition(async () => {
      const res = await releaseMesaAction(tenantSlug, { mesaId });
      if (!res.success) setError(res.error);
    });
  }

  function onDelete(mesaId: string) {
    if (!window.confirm("Excluir esta mesa?")) return;
    setError(null);
    setMesas((prev) => prev.filter((m) => m.id !== mesaId));
    startTransition(async () => {
      const res = await deleteMesaAction(tenantSlug, { mesaId });
      if (!res.success) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {mesas.length} mesa{mesas.length === 1 ? "" : "s"} cadastrada
          {mesas.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setShowNovaMesa((v) => !v)}>
          {showNovaMesa ? "Cancelar" : "+ Nova mesa"}
        </Button>
      </div>

      {showNovaMesa ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/70 p-3">
          <label className="text-xs text-muted-foreground">
            Número/nome
            <Input
              className="mt-1 w-32"
              value={novoNumero}
              onChange={(e) => setNovoNumero(e.target.value)}
              placeholder="Ex: 12"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Capacidade (opcional)
            <Input
              className="mt-1 w-32"
              value={novaCapacidade}
              onChange={(e) => setNovaCapacidade(e.target.value)}
              placeholder="Ex: 4"
              inputMode="numeric"
            />
          </label>
          <Button size="sm" disabled={pending} onClick={onCreateMesa}>
            Salvar mesa
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {mesas.map((mesa) => {
          const expanded = expandedMesaId === mesa.id;
          return (
            <div
              key={mesa.id}
              className="rounded-xl border border-border/70 bg-card/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Mesa {mesa.numero}
                  </p>
                  {mesa.capacidade ? (
                    <p className="text-[11px] text-muted-foreground">
                      {mesa.capacidade} lugares
                    </p>
                  ) : null}
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[mesa.status]}>
                  {STATUS_LABEL[mesa.status]}
                </Badge>
              </div>

              {mesa.ordemServicoId ? (
                <p className="mt-2 text-xs text-foreground">
                  {comandaLabel(mesa.ordemServicoId)}
                </p>
              ) : null}

              <button
                type="button"
                className="mt-2 text-xs text-primary underline"
                onClick={() => setExpandedMesaId(expanded ? null : mesa.id)}
              >
                {expanded ? "Fechar" : "Gerenciar"}
              </button>

              {expanded ? (
                <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
                  {mesa.status === "ocupada" && mesa.ordemServicoId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={pending}
                      onClick={() => onRelease(mesa.id)}
                    >
                      Liberar mesa
                    </Button>
                  ) : (
                    <label className="block text-[11px] text-muted-foreground">
                      Vincular comanda aberta
                      <select
                        className="mt-1 w-full rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs"
                        defaultValue=""
                        disabled={pending || comandas.length === 0}
                        onChange={(e) => onLinkComanda(mesa.id, e.target.value)}
                      >
                        <option value="" disabled>
                          {comandas.length === 0
                            ? "Nenhuma comanda aberta"
                            : "Selecione..."}
                        </option>
                        {comandas.map((c) => (
                          <option key={c.id} value={c.id}>
                            Comanda #{c.numero} — {c.status}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {(["livre", "reservada", "limpeza"] as MesaStatus[]).map(
                      (status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={mesa.status === status ? "default" : "outline"}
                          disabled={pending}
                          onClick={() => onChangeStatus(mesa.id, status)}
                        >
                          {STATUS_LABEL[status]}
                        </Button>
                      ),
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    disabled={pending}
                    onClick={() => onDelete(mesa.id)}
                  >
                    Excluir mesa
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {mesas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma mesa cadastrada ainda. Clique em &quot;+ Nova mesa&quot; para
          começar.
        </p>
      ) : null}
    </div>
  );
}
