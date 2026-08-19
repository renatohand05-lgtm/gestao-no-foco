export function appointmentWhen(inicio?: string | null): {
  data: string;
  hora: string;
} {
  if (!inicio) return { data: "", hora: "" };
  const d = new Date(inicio);
  return {
    data: inicio.slice(0, 10),
    hora: Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}
