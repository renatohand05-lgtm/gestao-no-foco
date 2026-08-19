import {
  customerEmailAvailable,
  customerWhatsappAvailable,
  toStoredWhatsapp,
} from "../clientes/phone.ts";

export type CustomerChannelResolution = {
  whatsappAvailable: boolean;
  emailAvailable: boolean;
  storedWhatsapp: string | null;
  email: string | null;
};

export function resolveCustomerChannels(input: {
  whatsapp?: string | null;
  telefone?: string | null;
  email?: string | null;
}): CustomerChannelResolution {
  const storedWhatsapp =
    toStoredWhatsapp(input.whatsapp) ?? toStoredWhatsapp(input.telefone);
  return {
    whatsappAvailable: customerWhatsappAvailable(input.whatsapp, input.telefone),
    emailAvailable: customerEmailAvailable(input.email),
    storedWhatsapp,
    email: input.email?.trim() || null,
  };
}
