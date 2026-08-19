/**
 * Sprint 35.2 — Templates de mensagem. Sem eval. Só {{variavel}}.
 */

export const MESSAGE_TEMPLATE_CODES = [
  "AGENDAMENTO_CRIADO",
  "AGENDAMENTO_CONFIRMADO",
  "LEMBRETE",
  "REAGENDAMENTO",
  "CANCELAMENTO",
  "RETORNO_D10",
  "RETORNO_D3",
  "RETORNO_HOJE",
  "RETORNO_ATRASADO",
  "REENGAJAMENTO",
  "SERVICE_READY",
  "SERVICE_DELIVERED",
  "BUDGET_PUBLISHED",
] as const;
export type MessageTemplateCode = (typeof MESSAGE_TEMPLATE_CODES)[number];

export const TEMPLATE_VARS = [
  "cliente_nome",
  "empresa_nome",
  "cliente",
  "empresa",
  "data",
  "hora",
  "data_hora",
  "servico",
  "profissional",
  "veiculo",
  "modelo",
  "placa",
  "valor",
  "secure_link",
  "dias_para_retorno",
] as const;
export type TemplateVar = (typeof TEMPLATE_VARS)[number];

export type TemplateContext = Partial<Record<TemplateVar, string>>;

const SAFE_TOKEN = /^[a-z_]+$/;

const BASE: Record<MessageTemplateCode, string> = {
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} foi realizado.\n\nData: {{data}}\nHorário: {{hora}}\n\nVeículo: {{veiculo}}",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} está confirmado.\n\nData: {{data}}\nHorário: {{hora}}",
  LEMBRETE:
    "Olá, {{cliente_nome}}! Lembrete: {{empresa_nome}} te espera em {{data}} às {{hora}}.",
  REAGENDAMENTO:
    "Olá, {{cliente_nome}}! Reagendamos seu horário na {{empresa_nome}} para {{data}} às {{hora}}.",
  CANCELAMENTO:
    "Olá, {{cliente_nome}}! O horário na {{empresa_nome}} em {{data}} às {{hora}} foi cancelado. Fale conosco para remarcar.",
  RETORNO_D10:
    "Olá, {{cliente_nome}}! Está chegando o período recomendado para seu retorno na {{empresa_nome}}. Faltam aproximadamente {{dias_para_retorno}} dias. Deseja agendar?",
  RETORNO_D3:
    "Olá, {{cliente_nome}}! Lembrete de retorno na {{empresa_nome}}. Serviço anterior: {{servico}}. Deseja agendar?",
  RETORNO_HOJE:
    "Olá, {{cliente_nome}}! Seu retorno na {{empresa_nome}} está previsto para hoje. Podemos agendar um horário?",
  RETORNO_ATRASADO:
    "Olá, {{cliente_nome}}! Seu retorno recomendado na {{empresa_nome}} já passou. Gostaria de agendar?",
  REENGAJAMENTO:
    "Olá, {{cliente_nome}}! Sentimos sua falta na {{empresa_nome}}. Quer retomar o acompanhamento?",
  SERVICE_READY:
    "Olá, {{cliente}}.\nSeu veículo está pronto.\n\n{{veiculo}}\n\nVocê já pode realizar a retirada.\n\n{{empresa}}",
  SERVICE_DELIVERED:
    "Olá, {{cliente_nome}}! Registramos a retirada do veículo na {{empresa_nome}}. Obrigado.",
  BUDGET_PUBLISHED:
    "Olá, {{cliente}}.\nSeu orçamento está disponível.\n\nVeículo: {{modelo}} · {{placa}}\nValor: {{valor}}\n\nAcesse para visualizar e aprovar:\n{{secure_link}}",
};

const PRIVATE: Record<MessageTemplateCode, string> = {
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} foi realizado.\n\nData: {{data}}\nHorário: {{hora}}",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} está confirmado.\n\nData: {{data}}\nHorário: {{hora}}",
  LEMBRETE:
    "Olá, {{cliente_nome}}! Lembrete: {{empresa_nome}} te espera em {{data}} às {{hora}}.",
  REAGENDAMENTO:
    "Olá, {{cliente_nome}}! Reagendamos para {{data}} às {{hora}} na {{empresa_nome}}.",
  CANCELAMENTO:
    "Olá, {{cliente_nome}}! O horário na {{empresa_nome}} foi cancelado. Fale conosco para remarcar.",
  RETORNO_D10:
    "Olá, {{cliente_nome}}! Seu retorno está se aproximando na {{empresa_nome}}. Faltam aproximadamente {{dias_para_retorno}} dias. Deseja agendar?",
  RETORNO_D3:
    "Olá, {{cliente_nome}}! Lembrete de retorno na {{empresa_nome}}. Deseja agendar?",
  RETORNO_HOJE:
    "Olá, {{cliente_nome}}! Seu retorno está previsto para hoje na {{empresa_nome}}. Podemos agendar?",
  RETORNO_ATRASADO:
    "Olá, {{cliente_nome}}! Gostaria de agendar seu retorno na {{empresa_nome}}?",
  REENGAJAMENTO:
    "Olá, {{cliente_nome}}! Quando quiser, estamos à disposição na {{empresa_nome}}.",
  SERVICE_READY:
    "Olá, {{cliente_nome}}! Seu atendimento na {{empresa_nome}} foi concluído e já está disponível.",
  SERVICE_DELIVERED:
    "Olá, {{cliente_nome}}! Registramos a conclusão do atendimento na {{empresa_nome}}.",
  BUDGET_PUBLISHED:
    "Olá, {{cliente}}.\nSeu orçamento está disponível.\nValor: {{valor}}\n\nAcesse para visualizar e aprovar:\n{{secure_link}}",
};

const CONSULTORIA: Partial<Record<MessageTemplateCode, string>> = {
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente_nome}}. Sua reunião está confirmada para {{data_hora}}.",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente_nome}}. Sua reunião está confirmada para {{data_hora}}.",
  LEMBRETE:
    "Olá, {{cliente_nome}}! Lembrete da reunião com a {{empresa_nome}} em {{data_hora}}.",
  RETORNO_D10:
    "Olá, {{cliente_nome}}! Está chegando a data de follow-up combinada com a {{empresa_nome}} ({{dias_para_retorno}} dias). Podemos marcar a reunião?",
  RETORNO_HOJE:
    "Olá, {{cliente_nome}}! Hoje é a data prevista para o follow-up com a {{empresa_nome}}.",
  REENGAJAMENTO:
    "Olá, {{cliente_nome}}! Queremos alinhar o próximo passo com a {{empresa_nome}}. Responda SIM para agendarmos.",
};

const BARBEARIA: Partial<Record<MessageTemplateCode, string>> = {
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente_nome}}. Seu horário está confirmado para {{data_hora}}.",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente_nome}}. Seu horário está confirmado para {{data_hora}}.",
  LEMBRETE:
    "Olá, {{cliente_nome}}! Lembrete: seu horário na {{empresa_nome}} é {{data_hora}}.",
};

const OFICINA: Partial<Record<MessageTemplateCode, string>> = {
  RETORNO_D10:
    "Olá, {{cliente_nome}}! Está chegando o período recomendado para o retorno do seu veículo à {{empresa_nome}}. Serviço anterior: {{servico}}. Veículo: {{veiculo}}. Faltam aproximadamente {{dias_para_retorno}} dias. Deseja agendar? Responda SIM para continuarmos.",
  SERVICE_READY:
    "Olá, {{cliente}}.\nSeu veículo está pronto.\n\n{{veiculo}}\n\nVocê já pode realizar a retirada.\n\n{{empresa}}",
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} foi realizado.\n\nData: {{data}}\nHorário: {{hora}}\n\nVeículo: {{veiculo}}",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} está confirmado.\n\nData: {{data}}\nHorário: {{hora}}",
  BUDGET_PUBLISHED:
    "Olá, {{cliente}}.\nSeu orçamento está disponível.\n\nVeículo: {{modelo}} · {{placa}}\nValor: {{valor}}\n\nAcesse para visualizar e aprovar:\n{{secure_link}}",
};

const LAVA: Partial<Record<MessageTemplateCode, string>> = {
  SERVICE_READY:
    "Olá, {{cliente}}.\nSeu veículo está pronto para retirada.\n\n{{veiculo}}\n\nVocê já pode realizar a retirada.\n\n{{empresa}}",
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} foi realizado.\n\nData: {{data}}\nHorário: {{hora}}\n\nVeículo: {{veiculo}}",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente}}.\nSeu agendamento na {{empresa}} está confirmado.\n\nData: {{data}}\nHorário: {{hora}}",
  BUDGET_PUBLISHED:
    "Olá, {{cliente}}.\nSeu orçamento está disponível.\n\nVeículo: {{modelo}} · {{placa}}\nValor: {{valor}}\n\nAcesse para visualizar e aprovar:\n{{secure_link}}",
};

export function templateFor(input: {
  code: MessageTemplateCode;
  segment?: string | null;
  hideProcedure?: boolean;
}): string {
  if (input.hideProcedure) return PRIVATE[input.code];
  if (input.segment === "consultoria" && CONSULTORIA[input.code]) {
    return CONSULTORIA[input.code] as string;
  }
  if (input.segment === "barbearia" && BARBEARIA[input.code]) {
    return BARBEARIA[input.code] as string;
  }
  if (input.segment === "oficina" && OFICINA[input.code]) {
    return OFICINA[input.code] as string;
  }
  if (input.segment === "lava_rapido" && LAVA[input.code]) {
    return LAVA[input.code] as string;
  }
  if (
    input.segment === "clinica_estetica" ||
    input.segment === "consultorio_odontologico"
  ) {
    return PRIVATE[input.code];
  }
  return BASE[input.code];
}

export function renderTemplate(
  source: string,
  input: TemplateContext,
): string {
  const ctx: TemplateContext = { ...input };
  if (!ctx.cliente && ctx.cliente_nome) ctx.cliente = ctx.cliente_nome;
  if (!ctx.cliente_nome && ctx.cliente) ctx.cliente_nome = ctx.cliente;
  if (!ctx.empresa && ctx.empresa_nome) ctx.empresa = ctx.empresa_nome;
  if (!ctx.empresa_nome && ctx.empresa) ctx.empresa_nome = ctx.empresa;
  if (!ctx.veiculo && (ctx.modelo || ctx.placa)) {
    const line = [ctx.modelo, ctx.placa].filter(Boolean).join(" · ");
    ctx.veiculo = line ? `Veículo: ${line}` : "";
  }
  if (!ctx.data_hora && (ctx.data || ctx.hora)) {
    ctx.data_hora = [ctx.data, ctx.hora].filter(Boolean).join(" às ");
  }
  const rendered = source.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, raw: string) => {
    const key = raw.toLowerCase();
    if (!SAFE_TOKEN.test(key)) return "";
    if (!(TEMPLATE_VARS as readonly string[]).includes(key)) return "";
    const value = ctx[key as TemplateVar];
    return value == null ? "" : String(value);
  });
  return rendered
    .replace(/\nVeículo:\s*·\s*/g, "\nVeículo: ")
    .replace(/\nVeículo:\s*\n/g, "\n")
    .replace(/\nVeículo:\s*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function assertNoCodeExecution(source: string): void {
  if (/<\s*script|javascript:|\{\{/i.test(source) === false) return;
  if (/\$\{|require\(|import\(|eval\(/i.test(source)) {
    throw new Error("Template inválido.");
  }
}
