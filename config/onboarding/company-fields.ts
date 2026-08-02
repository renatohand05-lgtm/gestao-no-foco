/**
 * Sprint 30.3 — Campos de dados da empresa (nenhum obrigatório no wizard).
 */

export type TaxRegime =
  | "simples_nacional"
  | "lucro_presumido"
  | "lucro_real"
  | "mei"
  | "outro"
  | "";

export type CompanyProfile = {
  tradeName: string;
  legalName: string;
  cnpj: string;
  stateRegistration: string;
  taxRegime: TaxRegime;
  phone: string;
  email: string;
  website: string;
  address: string;
  zip: string;
  city: string;
  state: string;
  country: string;
  logoUrl: string;
};

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  tradeName: "",
  legalName: "",
  cnpj: "",
  stateRegistration: "",
  taxRegime: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  zip: "",
  city: "",
  state: "",
  country: "Brasil",
  logoUrl: "",
};

export type CompanyFieldDef = {
  key: keyof CompanyProfile;
  label: string;
  placeholder?: string;
  input: "text" | "email" | "tel" | "url" | "select";
  options?: { value: string; label: string }[];
  required: boolean;
};

export const COMPANY_FIELDS: readonly CompanyFieldDef[] = [
  { key: "tradeName", label: "Nome fantasia", placeholder: "Ex: Oficina Silva", input: "text", required: false },
  { key: "legalName", label: "Razão social", placeholder: "Ex: Silva Serviços Ltda", input: "text", required: false },
  { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00", input: "text", required: false },
  { key: "stateRegistration", label: "Inscrição Estadual", input: "text", required: false },
  {
    key: "taxRegime",
    label: "Regime tributário",
    input: "select",
    required: false,
    options: [
      { value: "", label: "Não informado" },
      { value: "simples_nacional", label: "Simples Nacional" },
      { value: "lucro_presumido", label: "Lucro Presumido" },
      { value: "lucro_real", label: "Lucro Real" },
      { value: "mei", label: "MEI" },
      { value: "outro", label: "Outro" },
    ],
  },
  { key: "phone", label: "Telefone", placeholder: "(11) 99999-9999", input: "tel", required: false },
  { key: "email", label: "Email", placeholder: "contato@empresa.com", input: "email", required: false },
  { key: "website", label: "Site", placeholder: "https://", input: "url", required: false },
  { key: "address", label: "Endereço", placeholder: "Rua, número, bairro", input: "text", required: false },
  { key: "zip", label: "CEP", placeholder: "00000-000", input: "text", required: false },
  { key: "city", label: "Cidade", input: "text", required: false },
  { key: "state", label: "Estado", placeholder: "UF", input: "text", required: false },
  { key: "country", label: "País", input: "text", required: false },
  { key: "logoUrl", label: "Logo (URL)", placeholder: "https://…", input: "url", required: false },
] as const;

export function mergeCompanyProfile(
  partial: Partial<CompanyProfile> | null | undefined,
): CompanyProfile {
  return { ...EMPTY_COMPANY_PROFILE, ...(partial ?? {}) };
}
