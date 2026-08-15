"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  changeTenantSegmentAction,
  resetTenantSegmentPresetAction,
  toggleTenantCapabilityAction,
} from "@/lib/segments/actions";
import type { SegmentModuleRow } from "@/lib/segments/matrix.ts";
import type { ProductSegmentId } from "@/lib/segments/types.ts";

type SegmentOption = { id: ProductSegmentId; label: string };

type Props = {
  tenantSlug: string;
  canEdit: boolean;
  legacy: boolean;
  currentSegment: string | null;
  segmentOptions: SegmentOption[];
  rows: SegmentModuleRow[];
};

export function SegmentModulesForm({
  tenantSlug,
  canEdit,
  legacy,
  currentSegment,
  segmentOptions,
  rows,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [nextSegment, setNextSegment] = useState(
    currentSegment ?? segmentOptions[0]?.id ?? "oficina",
  );
  const [keepOverrides, setKeepOverrides] = useState(false);

  const toggleable = useMemo(
    () => rows.filter((r) => r.overridable),
    [rows],
  );

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "Não foi possível salvar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {legacy ? (
        <p className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm">
          Esta empresa ainda usa a experiência anterior. Escolher um tipo de
          negócio aplica o motor de segmentos sem apagar dados.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Módulo</th>
              <th className="px-3 py-2 font-medium">Padrão</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Real</th>
            </tr>
          </thead>
          <tbody>
            {toggleable.map((row) => (
              <tr key={row.capability} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{row.module}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.description}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {row.defaultOn ? "Ligado" : "Desligado"}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.currentOn}
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          toggleTenantCapabilityAction({
                            tenantSlug,
                            capability: row.capability,
                            enabled: !row.currentOn,
                          }),
                        )
                      }
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      {row.currentOn ? "Ativado" : "Desativado"}
                    </button>
                  ) : (
                    <span>{row.currentOn ? "Ativado" : "Desativado"}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.origin === "custom" ? "Customizado" : "Padrão do segmento"}
                </td>
                <td className="px-3 py-2 text-xs">{row.statusReal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setResetOpen(true)}
          >
            Restaurar padrão do segmento
          </Button>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Tipo de negócio
              <NativeSelect
                className="mt-1"
                value={nextSegment}
                onChange={(e) => setNextSegment(e.target.value)}
              >
                {segmentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setChangeOpen(true)}
            >
              Aplicar tipo
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Somente o proprietário ou administrador pode alterar módulos.
        </p>
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Restaurar padrão do segmento?"
        description="Remove as personalizações desta empresa e volta ao preset. Nenhum dado de módulo é apagado — só a visibilidade muda."
        confirmLabel="Restaurar"
        loading={pending}
        onConfirm={() => {
          setResetOpen(false);
          run(() => resetTenantSegmentPresetAction({ tenantSlug }));
        }}
      />

      <ConfirmDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        title="Alterar tipo de negócio?"
        description={
          <div className="space-y-3">
            <p>
              O preset do novo tipo será aplicado. Dados existentes permanecem.
              Nenhum tenant_id é alterado.
            </p>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={keepOverrides}
                onChange={(e) => setKeepOverrides(e.target.checked)}
              />
              Manter personalizações compatíveis
            </label>
          </div>
        }
        confirmLabel="Alterar"
        loading={pending}
        onConfirm={() => {
          setChangeOpen(false);
          run(() =>
            changeTenantSegmentAction({
              tenantSlug,
              segment: nextSegment,
              resetOverrides: !keepOverrides,
            }),
          );
        }}
      />
    </div>
  );
}
