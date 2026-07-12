"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/financeiro/conta-receber-utils";
import { formatCurrency, formatVendaNumero } from "@/lib/vendas/format";
import { faturarEReceberVendaAction } from "@/lib/vendas/actions";
import {
  faturarEReceberVendaFormSchema,
  type FaturarEReceberVendaFormInput,
  type FaturarEReceberVendaFormValues,
} from "@/lib/vendas/validations";

type Props = {
  tenantSlug: string;
  vendaId: string;
  vendaNumero: number;
  valorReceber: number;
  contasBancarias: { id: string; nome: string }[];
  redirectTo?: string;
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function VendaFaturarEReceberButton({
  tenantSlug,
  vendaId,
  vendaNumero,
  valorReceber,
  contasBancarias,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<
    FaturarEReceberVendaFormInput,
    unknown,
    FaturarEReceberVendaFormValues
  >({
    resolver: zodResolver(faturarEReceberVendaFormSchema),
    defaultValues: {
      conta_bancaria_id: "",
      data_recebimento: todayISO(),
    },
  });

  function handleConfirm() {
    setError(null);

    if (contasBancarias.length === 0) {
      setError("Cadastre uma conta bancária ativa para receber.");
      return;
    }

    void form.handleSubmit((values) => {
      startTransition(async () => {
        const result = await faturarEReceberVendaAction(
          tenantSlug,
          vendaId,
          values,
        );

        if (!result.success) {
          setError(result.error);
          return;
        }

        setOpen(false);
        router.push(
          redirectTo ??
            `/${tenantSlug}/vendas/${vendaId}?success=faturado_recebido`,
        );
        router.refresh();
      });
    })();
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={isPending}
      >
        <Banknote className="mr-2 size-4" />
        Faturar e receber
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Faturar e receber"
        description={
          <div className="space-y-4 text-left">
            <p>
              Confirmar faturamento e recebimento imediato da venda{" "}
              <strong>{formatVendaNumero(vendaNumero)}</strong>? O estoque será
              baixado e o valor entrará na conta bancária selecionada.
            </p>

            <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Valor a receber
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {formatCurrency(valorReceber)}
              </p>
            </div>

            {contasBancarias.length === 0 ? (
              <p className="text-sm text-destructive">
                Nenhuma conta bancária ativa. Cadastre uma conta antes de
                receber.
              </p>
            ) : (
              <FormGrid>
                <FormField
                  label="Conta bancária / caixa"
                  htmlFor="conta_bancaria_id"
                  required
                  error={form.formState.errors.conta_bancaria_id?.message}
                  className="md:col-span-2"
                >
                  <select
                    id="conta_bancaria_id"
                    {...form.register("conta_bancaria_id")}
                    className={selectClassName}
                  >
                    <option value="">Selecione a conta</option>
                    {contasBancarias.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label="Data de recebimento"
                  htmlFor="data_recebimento"
                  required
                  error={form.formState.errors.data_recebimento?.message}
                >
                  <Input
                    id="data_recebimento"
                    type="date"
                    {...form.register("data_recebimento")}
                  />
                </FormField>
              </FormGrid>
            )}
          </div>
        }
        confirmLabel="Confirmar faturamento e recebimento"
        loading={isPending}
        error={error}
        onConfirm={handleConfirm}
      />
    </>
  );
}
