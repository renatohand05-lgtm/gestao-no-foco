"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { Input } from "@/components/ui/input";
import { receberContaReceberAction } from "@/lib/financeiro/actions";
import {
  calcValorLiquido,
  todayISO,
} from "@/lib/financeiro/conta-receber-utils";
import { formatCurrency } from "@/lib/financeiro/format";
import {
  receberContaFormSchema,
  type ReceberContaFormInput,
  type ReceberContaFormValues,
} from "@/lib/financeiro/validations";
import type { ContaReceberDetail, ContaReceberListItem } from "@/types/contas-receber";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  item: ContaReceberListItem | ContaReceberDetail;
  contasBancarias: { id: string; nome: string }[];
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ContaReceberReceberDialog({
  open,
  onOpenChange,
  tenantSlug,
  item,
  contasBancarias,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ReceberContaFormInput, unknown, ReceberContaFormValues>({
    resolver: zodResolver(receberContaFormSchema),
    defaultValues: {
      data_recebimento: todayISO(),
      valor_recebido: calcValorLiquido(item),
      desconto: item.desconto,
      juros: item.juros,
      multa: item.multa,
      conta_bancaria_id: item.conta_bancaria_id ?? "",
    },
  });

  const desconto = useWatch({ control: form.control, name: "desconto" }) ?? 0;
  const juros = useWatch({ control: form.control, name: "juros" }) ?? 0;
  const multa = useWatch({ control: form.control, name: "multa" }) ?? 0;

  const valorIntegral = calcValorLiquido({
    valor_original: item.valor_original,
    desconto: Number.isFinite(desconto) ? desconto : 0,
    juros: Number.isFinite(juros) ? juros : 0,
    multa: Number.isFinite(multa) ? multa : 0,
  });

  useEffect(() => {
    form.setValue("valor_recebido", valorIntegral, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [form, valorIntegral]);

  function handleConfirm() {
    setError(null);

    void form.handleSubmit((values) => {
      startTransition(async () => {
        const result = await receberContaReceberAction(tenantSlug, item.id, {
          ...values,
          valor_recebido: valorIntegral,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        onOpenChange(false);
        router.push(
          `/${tenantSlug}/financeiro/contas-receber/${item.id}?success=recebido`,
        );
        router.refresh();
      });
    })();
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar recebimento"
      description={
        <div className="space-y-4">
          <p>
            Confirme a baixa do título <strong>{item.descricao}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Quitação integral: o valor recebido acompanha o líquido do título
            (desconto, juros e multa). Recebimento parcial não é permitido nesta
            sprint.
          </p>
          <FormGrid>
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
            <FormField
              label="Valor recebido (integral)"
              htmlFor="valor_recebido"
              required
              error={form.formState.errors.valor_recebido?.message}
            >
              <Input
                id="valor_recebido"
                type="number"
                step="0.01"
                readOnly
                className="bg-muted"
                {...form.register("valor_recebido", { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Calculado automaticamente: {formatCurrency(valorIntegral)}
              </p>
            </FormField>
            <FormField label="Desconto" htmlFor="desconto">
              <Input
                id="desconto"
                type="number"
                step="0.01"
                {...form.register("desconto", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Juros" htmlFor="juros">
              <Input
                id="juros"
                type="number"
                step="0.01"
                {...form.register("juros", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Multa" htmlFor="multa">
              <Input
                id="multa"
                type="number"
                step="0.01"
                {...form.register("multa", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Conta bancária"
              htmlFor="conta_bancaria_id"
              required
              error={form.formState.errors.conta_bancaria_id?.message}
            >
              <select
                id="conta_bancaria_id"
                {...form.register("conta_bancaria_id")}
                className={selectClassName}
              >
                <option value="">Selecione uma conta</option>
                {contasBancarias.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>
            </FormField>
          </FormGrid>
        </div>
      }
      confirmLabel="Confirmar baixa"
      loading={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
