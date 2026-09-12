/**
 * O Supabase Auth manda mensagens de erro em inglês por padrão — essa
 * função traduz os casos mais comuns (login e cadastro) pra português.
 * Qualquer mensagem não reconhecida cai num fallback genérico em
 * português, nunca no texto original em inglês.
 */
export function humanizeAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "E-mail ou senha incorretos. Verifique e tente novamente.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (/failed to fetch/i.test(message)) {
    return "Falha de comunicação com o servidor. Verifique a conexão e tente de novo.";
  }
  if (/user already registered|already been registered|email.*already.*exists/i.test(message)) {
    return "Esse e-mail já está cadastrado. Tente entrar em vez de criar uma conta nova.";
  }
  if (/password.*(known to be weak|easy to guess|pwned|compromised)/i.test(message)) {
    return "Essa senha é muito fácil de adivinhar ou já vazou em outro lugar. Escolha uma senha diferente.";
  }
  if (/password should be at least/i.test(message)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (/unable to validate email address|invalid email/i.test(message)) {
    return "E-mail inválido. Confira e tente de novo.";
  }
  if (/email rate limit exceeded|too many requests/i.test(message)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  }
  if (/signup.*disabled|signups not allowed/i.test(message)) {
    return "Novos cadastros estão temporariamente desativados. Tente novamente mais tarde.";
  }
  return "Não foi possível concluir. Verifique os dados e tente novamente.";
}
