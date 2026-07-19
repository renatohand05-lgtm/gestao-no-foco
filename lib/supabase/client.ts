import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

function assertPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.replace(/\/$/, ""))) {
    throw new Error(
      "Configuração inválida: NEXT_PUBLIC_SUPABASE_URL ausente ou malformada. Atualize o .env.local e reinicie o servidor.",
    );
  }

  const placeholder =
    !anonKey ||
    /COLE_AQUI|placeholder|changeme|your[-_ ]?(anon|key|supabase)/i.test(anonKey) ||
    !anonKey.startsWith("eyJ") ||
    anonKey.length < 100;

  if (placeholder) {
    throw new Error(
      "Configuração inválida: NEXT_PUBLIC_SUPABASE_ANON_KEY está ausente, é um placeholder ou não é uma chave JWT válida. Cole a anon/public key do Supabase em .env.local e reinicie o servidor (npm run dev).",
    );
  }

  return { url, anonKey };
}

export function createClient() {
  const { url, anonKey } = assertPublicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
