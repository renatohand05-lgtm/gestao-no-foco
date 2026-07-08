// Reexporta validações para compatibilidade interna do módulo.
export {
  clienteFormSchema,
  type ClienteFormValues,
} from "@/lib/clientes/validations";

export {
  normalizeClienteFormValues,
  clienteToFormValues,
  buildClientePayload,
} from "@/lib/clientes/mappers";
