/** Copy de compartilhamento de orçamento — sem diagnóstico clínico. */

export function buildOrcamentoCustomerMessage(input: {
  clienteNome: string;
  totalLabel: string;
  validadeLabel: string;
  link: string;
}): string {
  const cliente = input.clienteNome.trim() || "cliente";
  return [
    `Olá, ${cliente}. Seu orçamento está disponível para análise:`,
    input.link,
    "",
    `Valor: ${input.totalLabel}`,
    `Validade: ${input.validadeLabel}`,
    "",
    "Você pode aprovar ou recusar pelo link.",
  ].join("\n");
}
