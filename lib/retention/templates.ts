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
] as const;
export type MessageTemplateCode = (typeof MESSAGE_TEMPLATE_CODES)[number];

export const TEMPLATE_VARS = [
  "cliente_nome",
  "empresa_nome",
  "data",
  "hora",
  "data_hora",
  "servico",
  "profissional",
  "veiculo",
  "placa",
  "dias_para_retorno",
] as const;
export type TemplateVar = (typeof TEMPLATE_VARS)[number];

export type TemplateContext = Partial<Record<TemplateVar, string>>;

const SAFE_TOKEN = /^[a-z_]+$/;

const BASE: Record<MessageTemplateCode, string> = {
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente_nome}}! Seu horário na {{empresa_nome}} está marcado para {{data}} às {{hora}}. Serviço: {{servico}}. Responda se precisar alterar.",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente_nome}}! Confirmamos seu horário na {{empresa_nome}} em {{data}} às {{hora}}.",
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
    "Olá, {{cliente_nome}}! Tudo bem?\n\nSeu veículo está pronto na {{empresa_nome}}.\n\n{{servico}}\n{{veiculo}}\n\nO serviço foi concluído e o veículo está disponível para retirada.\n\nSe precisar, fale conosco por aqui.",
  SERVICE_DELIVERED:
    "Olá, {{cliente_nome}}! Registramos a retirada do veículo na {{empresa_nome}}. Obrigado.",
};

const PRIVATE: Record<MessageTemplateCode, string> = {
  AGENDAMENTO_CRIADO:
    "Olá, {{cliente_nome}}! Seu horário na {{empresa_nome}} está marcado para {{data}} às {{hora}}.",
  AGENDAMENTO_CONFIRMADO:
    "Olá, {{cliente_nome}}! Confirmamos seu horário na {{empresa_nome}} em {{data}} às {{hora}}.",
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
    "Olá, {{cliente_nome}}.\nSeu veículo está pronto.\n{{veiculo}}\n\nVocê já pode realizar a retirada.\n\n{{empresa_nome}}",
};

const LAVA: Partial<Record<MessageTemplateCode, string>> = {
  SERVICE_READY:
    "Olá, {{cliente_nome}}!\nSeu veículo está pronto.\n\nO atendimento realizado pela {{empresa_nome}} foi concluído e o veículo já está disponível para retirada.\n\n{{veiculo}}\n\nAté breve.",
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
  return rendered.replace(/\n{3,}/g, "\n\n").trim();
}

export function assertNoCodeExecution(source: string): void {
  if (/<\s*script|javascript:|\{\{/i.test(source) === false) return;
  if (/\$\{|require\(|import\(|eval\(/i.test(source)) {
    throw new Error("Template inválido.");
  }
}
