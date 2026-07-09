"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { Input } from "@/components/ui/input";
import { receberContaReceberAction } from "@/lib/financeiro/actions";
import {
  calcSaldoPendente,
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
};

export function ContaReceberReceberDialog({
  open,
  onOpenChange,
  tenantSlug,
  item,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valorLiquido = calcValorLiquido(item);
  const saldo = calcSaldoPendente(item);

  const form = useForm<ReceberContaFormInput, unknown, ReceberContaFormValues>({
    resolver: zodResolver(receberContaFormSchema),
    defaultValues: {
      data_recebimento: todayISO(),
      valor_recebido: saldo,
      desconto: item.desconto,
      juros: item.juros,
      multa: item.multa,
    },
  });

  function handleConfirm() {
    setError(null);
    const values = form.getValues();

    startTransition(async () => {
      const result = await receberContaReceberAction(
        tenantSlug,
        item.id,
        values,
      );

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
            Valor líquido: {formatCurrency(valorLiquido)} · Saldo pendente:{" "}
            {formatCurrency(saldo)}
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
              label="Valor recebido"
              htmlFor="valor_recebido"
              error={form.formState.errors.valor_recebido?.message}
            >
              <Input
                id="valor_recebido"
                type="number"
                step="0.01"
                {...form.register("valor_recebido", { valueAsNumber: true })}
              />
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
