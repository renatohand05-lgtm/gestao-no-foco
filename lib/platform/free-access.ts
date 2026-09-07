"use server";

import { randomBytes } from "crypto";

import { siteConfig } from "@/config/site";
import { isPlatformOwner } from "@/lib/platform/platform-access-service";
import { createClient } from "@/lib/supabase/server";

export type FreeAccessInvite = {
  id: string;
  code: string;
  note: string | null;
  link: string;
  usedByTenantId: string | null;
  usedByTenantName: string | null;
  usedAt: string | null;
  createdAt: string;
};

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function generateCode(): string {
  // 8 caracteres, sem ambíguos (0/O, 1/I/L) — fácil de digitar se precisar.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

async function requireOwner() {
  const isOwner = await isPlatformOwner();
  if (!isOwner) throw new Error("Acesso restrito ao dono da plataforma.");
  return createClient();
}

export async function generateFreeAccessInvite(
  note: string,
): Promise<ActionResult<FreeAccessInvite>> {
  try {
    const client = await requireOwner();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    const code = generateCode();
    const { data, error } = await client
      .from("free_access_invites" as never)
      .insert({
        code,
        note: note.trim() || null,
        created_by: user.id,
      } as never)
      .select("id, code, note, created_at")
      .single<{ id: string; code: string; note: string | null; created_at: string }>();

    if (error || !data) throw new Error(error?.message ?? "Falha ao gerar o convite.");

    return {
      success: true,
      data: {
        id: data.id,
        code: data.code,
        note: data.note,
        link: `${siteConfig.url}/register?convite=${data.code}`,
        usedByTenantId: null,
        usedByTenantName: null,
        usedAt: null,
        createdAt: data.created_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao gerar o convite.",
    };
  }
}

export async function listFreeAccessInvites(): Promise<ActionResult<FreeAccessInvite[]>> {
  try {
    const client = await requireOwner();

    const { data, error } = await client
      .from("free_access_invites" as never)
      .select("id, code, note, used_by_tenant_id, used_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      code: string;
      note: string | null;
      used_by_tenant_id: string | null;
      used_at: string | null;
      created_at: string;
    }>;

    const tenantIds = [...new Set(rows.map((r) => r.used_by_tenant_id).filter(Boolean))] as string[];
    const tenantNames = new Map<string, string>();
    if (tenantIds.length > 0) {
      const { data: tenants } = await client
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds);
      for (const t of (tenants ?? []) as { id: string; name: string }[]) {
        tenantNames.set(t.id, t.name);
      }
    }

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        code: r.code,
        note: r.note,
        link: `${siteConfig.url}/register?convite=${r.code}`,
        usedByTenantId: r.used_by_tenant_id,
        usedByTenantName: r.used_by_tenant_id
          ? (tenantNames.get(r.used_by_tenant_id) ?? null)
          : null,
        usedAt: r.used_at,
        createdAt: r.created_at,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao carregar os convites.",
    };
  }
}
