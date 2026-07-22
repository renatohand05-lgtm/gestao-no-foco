"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  apontarHorasAction,
  atribuirMecanicoOsAction,
  removerMecanicoOsAction,
  transferirMecanicoOsAction,
} from "@/lib/mecanicos/actions";
import {
  MECANICO_ESPECIALIDADE_LABELS,
  type OsMecanicoPapel,
} from "@/lib/mecanicos/constants";
import type { Mecanico } from "@/lib/mecanicos/mecanico-service";
import type {
  OrdemServicoMecanico,
  OsCustoReal,
} from "@/lib/mecanicos/os-mecanico-service";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  osId: string;
  alocacoes: OrdemServicoMecanico[];
  mecanicos: Mecanico[];
  custoReal: OsCustoReal | null;
  canAtribuir: boolean;
  canTransferir: boolean;
  canApontar: boolean;
};

export function OsMecanicoBinder({
  tenantSlug,
  osId,
  alocacoes,
  mecanicos,
  custoReal,
  canAtribuir,
  canTransferir,
  canApontar,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mecanicoId, setMecanicoId] = useState("");
  const [papel, setPapel] = useState<OsMecanicoPapel>("principal");
  const [percentual, setPercentual] = useState("100");
  const [transferPara, setTransferPara] = useState("");

  const principal = alocacoes.find((a) => a.papel === "principal");

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setError(result.error ?? "Falha.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Mecânicos da OS
      </p>
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      {alocacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum mecânico vinculado.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {alocacoes.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"
            >
              <div>
                <span className="font-medium">
                  {a.mecanico?.nome_completo ?? a.mecanico_id}
                </span>
                <span className="ml-2 text-xs capitalize text-muted-foreground">
                  {a.papel.replace("_", " ")} · {a.percentual_participacao}%
                </span>
                {a.mecanico?.especialidade ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {MECANICO_ESPECIALIDADE_LABELS[
                      a.mecanico.especialidade as keyof typeof MECANICO_ESPECIALIDADE_LABELS
                    ] ?? a.mecanico.especialidade}
                  </span>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  Est. {a.horas_estimadas}h · Real {a.horas_realizadas}h ·{" "}
                  {a.mecanico?.disponibilidade ?? "—"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {canApontar ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() =>
                        run(() =>
                          apontarHorasAction(tenantSlug, {
                            mecanicoId: a.mecanico_id,
                            acao: "iniciar",
                            ordemId: osId,
                          }),
                        )
                      }
                    >
                      Iniciar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() =>
                        run(() =>
                          apontarHorasAction(tenantSlug, {
                            mecanicoId: a.mecanico_id,
                            acao: "pausar",
                            ordemId: osId,
                          }),
                        )
                      }
                    >
                      Pausar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() =>
                        run(() =>
                          apontarHorasAction(tenantSlug, {
                            mecanicoId: a.mecanico_id,
                            acao: "retomar",
                            ordemId: osId,
                          }),
                        )
                      }
                    >
                      Retomar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      onClick={() =>
                        run(() =>
                          apontarHorasAction(tenantSlug, {
                            mecanicoId: a.mecanico_id,
                            acao: "finalizar",
                            ordemId: osId,
                          }),
                        )
                      }
                    >
                      Finalizar
                    </button>
                  </>
                ) : null}
                {canAtribuir && a.papel !== "principal" ? (
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    onClick={() =>
                      run(() =>
                        removerMecanicoOsAction(
                          tenantSlug,
                          osId,
                          a.id,
                          "removido_ui",
                        ),
                      )
                    }
                  >
                    Remover
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAtribuir ? (
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <label className="space-y-1 text-xs">
            <span>Mecânico</span>
            <select
              className="h-9 min-w-44 rounded-md border px-2 text-sm"
              value={mecanicoId}
              onChange={(e) => setMecanicoId(e.target.value)}
            >
              <option value="">Selecionar…</option>
              {mecanicos
                .filter((m) => m.status === "ativo")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome_completo} ({m.disponibilidade})
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span>Papel</span>
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={papel}
              onChange={(e) => setPapel(e.target.value as OsMecanicoPapel)}
            >
              <option value="principal">Principal</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="responsavel_tecnico">Resp. técnico</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span>%</span>
            <input
              type="number"
              min={0}
              max={100}
              className="h-9 w-20 rounded-md border px-2 text-sm"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={pending || !mecanicoId}
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() =>
              run(() =>
                atribuirMecanicoOsAction(
                  tenantSlug,
                  osId,
                  mecanicoId,
                  papel,
                  Number(percentual) || 0,
                ),
              )
            }
          >
            Vincular
          </button>
        </div>
      ) : null}

      {canTransferir && principal ? (
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <label className="space-y-1 text-xs">
            <span>Transferir responsabilidade para</span>
            <select
              className="h-9 min-w-44 rounded-md border px-2 text-sm"
              value={transferPara}
              onChange={(e) => setTransferPara(e.target.value)}
            >
              <option value="">Selecionar…</option>
              {mecanicos
                .filter(
                  (m) => m.status === "ativo" && m.id !== principal.mecanico_id,
                )
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome_completo}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !transferPara}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            onClick={() =>
              run(() =>
                transferirMecanicoOsAction(
                  tenantSlug,
                  osId,
                  principal.mecanico_id,
                  transferPara,
                  "transferencia_ui",
                ),
              )
            }
          >
            Transferir
          </button>
        </div>
      ) : null}

      {custoReal ? (
        <div className="grid gap-2 border-t pt-3 text-xs sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Custo MO realizado</p>
            <p className="font-medium">{formatCurrency(custoReal.custoMaoObra)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Custo total OS</p>
            <p className="font-medium">
              {formatCurrency(custoReal.custoRealizado)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Margem líquida est.</p>
            <p className="font-medium">
              {formatCurrency(custoReal.margemLiquidaEstimada)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Estimado × realizado</p>
            <p className="font-medium">
              {formatCurrency(custoReal.custoEstimado)} /{" "}
              {formatCurrency(custoReal.custoRealizado)} (Δ{" "}
              {formatCurrency(custoReal.desvio)})
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
