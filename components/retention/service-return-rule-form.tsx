"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { upsertServiceReturnRuleAction } from "@/lib/retention/actions";
import {
  defaultReturnRuleForSegment,
  EMPTY_RETURN_RULE,
  type ReturnRule,
} from "@/lib/retention/returns";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  produtoId: string;
  segment: string | null;
  initial?: ReturnRule | null;
};

export function ServiceReturnRuleForm({
  tenantSlug,
  produtoId,
  segment,
  initial,
}: Props) {
  const suggested = defaultReturnRuleForSegment(segment);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rule, setRule] = useState<ReturnRule>(initial ?? EMPTY_RETURN_RULE);

  return (
    <div className="space-y-3" data-phase35="service-return-rule">
      <p className="text-sm text-muted-foreground">
        Opcional. Não é obrigatório. Sugestão do segmento:{" "}
        {suggested.returnEnabled
          ? `${suggested.intervalDays ?? suggested.intervalMonths ?? "—"} / tipo ${suggested.returnType}`
          : "desligada"}
        .
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rule.returnEnabled}
          onChange={(e) =>
            setRule((r) => ({ ...r, returnEnabled: e.target.checked }))
          }
        />
        Sugerir retorno após o serviço
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs">
          Tipo
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={rule.returnType}
            onChange={(e) =>
              setRule((r) => ({
                ...r,
                returnType: e.target.value as ReturnRule["returnType"],
              }))
            }
          >
            <option value="data">Data</option>
            <option value="km">Km</option>
            <option value="data_ou_km">Data e/ou km</option>
            <option value="sessao">Sessão</option>
            <option value="follow_up">Follow-up</option>
          </select>
        </label>
        <label className="text-xs">
          Dias
          <input
            type="number"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={rule.intervalDays ?? ""}
            onChange={(e) =>
              setRule((r) => ({
                ...r,
                intervalDays: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </label>
        <label className="text-xs">
          Meses
          <input
            type="number"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={rule.intervalMonths ?? ""}
            onChange={(e) =>
              setRule((r) => ({
                ...r,
                intervalMonths: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </label>
        {segment === "oficina" ? (
          <label className="text-xs">
            Intervalo km
            <input
              type="number"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={rule.mileageKm ?? ""}
              onChange={(e) =>
                setRule((r) => ({
                  ...r,
                  mileageKm: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </label>
        ) : null}
        {(segment === "clinica_estetica" ||
          segment === "consultorio_odontologico") && (
          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <input
              type="checkbox"
              checked={rule.hideProcedure}
              onChange={(e) =>
                setRule((r) => ({ ...r, hideProcedure: e.target.checked }))
              }
            />
            Não citar procedimento na mensagem
          </label>
        )}
      </div>
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants())}
        onClick={() =>
          startTransition(async () => {
            const res = await upsertServiceReturnRuleAction(tenantSlug, {
              produtoId,
              ...rule,
            });
            if (!res.success) alert(res.error);
            else router.refresh();
          })
        }
      >
        Salvar regra de retorno
      </button>
    </div>
  );
}
