"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { Input } from "@/components/ui/input";
import { pagarContaPagarAction } from "@/lib/financeiro/actions";
import {
  calcSaldoPendente,
  calcValorLiquido,
  todayISO,
} from "@/lib/financeiro/conta-pagar-utils";
import { formatCurrency } from "@/lib/financeiro/format";
import {
  pagarContaFormSchema,
  type PagarContaFormInput,
  type PagarContaFormValues,
} from "@/lib/financeiro/validations";
import type { ContaPagarDetail, ContaPagarListItem } from "@/types/contas-pagar";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  item: ContaPagarListItem | ContaPagarDetail;
  formasPagamento: { id: string; nome: string }[];
  contasBancarias: { id: string; nome: string }[];
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ContaPagarPagarDialog({
  open,
  onOpenChange,
  tenantSlug,
  item,
  formasPagamento,
  contasBancarias,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valorLiquido = calcValorLiquido(item);
  const saldo = calcSaldoPendente(item);

  const form = useForm<PagarContaFormInput, unknown, PagarContaFormValues>({
    resolver: zodResolver(pagarContaFormSchema),
    defaultValues: {
      data_pagamento: todayISO(),
      valor_pagamento: saldo,
      desconto: item.desconto,
      juros: item.juros,
      multa: item.multa,
      forma_pagamento_id: "",
      conta_bancaria_id: "",
    },
  });

  function handleConfirm() {
    setError(null);
    const values = form.getValues();

    startTransition(async () => {
      const result = await pagarContaPagarAction(tenantSlug, item.id, values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(
        `/${tenantSlug}/financeiro/contas-pagar/${item.id}?success=pago`,
      );
      router.refresh();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar pagamento"
      wide
      description={
        <div className="space-y-4">
          <p>
            Confirme a baixa do título <strong>{item.descricao}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Valor líquido: {formatCurrency(valorLiquido)} · Saldo pendente:{" "}
            {formatCurrency(saldo)}
            {item.valor_pago > 0
              ? ` · Já pago: ${formatCurrency(item.valor_pago)}`
              : ""}
          </p>
          <FormGrid>
            <FormField
              label="Data de pagamento"
              htmlFor="data_pagamento"
              required
              error={form.formState.errors.data_pagamento?.message}
            >
              <Input
                id="data_pagamento"
                type="date"
                {...form.register("data_pagamento")}
              />
            </FormField>
            <FormField
              label="Valor deste pagamento"
              htmlFor="valor_pagamento"
              error={form.formState.errors.valor_pagamento?.message}
            >
              <Input
                id="valor_pagamento"
                type="number"
                step="0.01"
                {...form.register("valor_pagamento", { valueAsNumber: true })}
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
            <FormField label="Forma de pagamento" htmlFor="forma_pagamento_id">
              <select
                id="forma_pagamento_id"
                {...form.register("forma_pagamento_id")}
                className={selectClassName}
              >
                <option value="">Não informada</option>
                {formasPagamento.map((forma) => (
                  <option key={forma.id} value={forma.id}>
                    {forma.nome}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Conta bancária" htmlFor="conta_bancaria_id">
              <select
                id="conta_bancaria_id"
                {...form.register("conta_bancaria_id")}
                className={selectClassName}
              >
                <option value="">Não informada</option>
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
