export function getAuthErrorMessage(error: { message: string; status?: number }) {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (message.includes("user already registered")) {
    return "Este e-mail já está cadastrado.";
  }

  if (message.includes("password")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  if (message.includes("rate limit")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}
