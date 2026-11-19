import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { TenantWithRole } from "@/types";

import { MENU_REDE, modulosDoItem } from "./menu";
import { lerPerfil, podeEditar, podeVerAlgum } from "./permissoes";
import type { ModuloRede, PerfilRede } from "./tipos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = { from: (t: string) => any; rpc: (fn: string, args?: object) => any };

export type RedeContexto = {
  tenant: TenantWithRole;
  userId: string;
  perfil: PerfilRede | null;
  db: Db;
};

/**
 * Empresa + usuário + perfil na rede. A empresa precisa ter o módulo ligado
 * (senão 404). O perfil vem do banco (`rede_meu_perfil`); null = sem acesso.
 */
export const getRedeContexto = cache(async (slug: string): Promise<RedeContexto> => {
  const tenant = await requireTenant(slug);
  if (!tenant.rede_operacional) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const db = supabase as unknown as Db;
  const { data, error } = await db.rpc("rede_meu_perfil", { p_tenant: tenant.id });
  return { tenant, userId: user.id, perfil: error ? null : lerPerfil(data), db };
});

/**
 * Para páginas: exige acesso de leitura ao módulo (ou a pelo menos um, nas abas que juntam mais de um).
 * Sem acesso, leva para a primeira aba que a pessoa pode ver (ou 404 se nenhuma).
 */
export async function exigirModulo(slug: string, modulo: ModuloRede | readonly ModuloRede[]): Promise<RedeContexto> {
  const ctx = await getRedeContexto(slug);
  const pedidos: readonly ModuloRede[] = typeof modulo === "string" ? [modulo] : modulo;
  if (!podeVerAlgum(ctx.perfil, pedidos)) {
    const destino = MENU_REDE.find((m) => !modulosDoItem(m).some((x) => pedidos.includes(x)) && podeVerAlgum(ctx.perfil, modulosDoItem(m)));
    if (destino) redirect(`/${slug}/rede${destino.href}`);
    notFound();
  }
  return ctx;
}

/** Para ações: exige permissão de gravação no módulo. Lança erro legível. */
export async function exigirEdicao(slug: string, modulo: ModuloRede): Promise<RedeContexto> {
  const ctx = await getRedeContexto(slug);
  if (!podeEditar(ctx.perfil, modulo)) {
    throw new Error("Você não tem permissão para alterar este módulo.");
  }
  return ctx;
}
