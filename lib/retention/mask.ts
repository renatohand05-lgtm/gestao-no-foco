const PHONE = /\d{8,}/g;

export function maskAddress(value?: string | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.includes("@")) {
    const [user, domain] = raw.split("@");
    const u = user.slice(0, 1) + "•••";
    return `${u}@${domain}`;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `•••${digits.slice(-4)}`;
}

export function operatorPhonePreview(value?: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return maskAddress(value);
  return `(${digits.slice(0, 2)}) XXXXX-${digits.slice(-4)}`;
}

export function scrubSecrets(text: string): string {
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(PHONE, (m) => `•••${m.slice(-4)}`);
}
