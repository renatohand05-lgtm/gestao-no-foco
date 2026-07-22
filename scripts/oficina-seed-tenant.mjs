/**
 * Seed idempotente — tenant teste-renato-01
 * ensure_consumidor_balcao + alçadas + permissões
 *
 * Uso: node --env-file=.env.local scripts/oficina-seed-tenant.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = { ...process.env };
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const TENANT_SLUG = env.AUDIT_TENANT_SLUG || "teste-renato-01";
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PERMISSION_KEYS = [
  "venda_rapida.criar",
  "venda_rapida.sem_cliente",
  "desconto.aplicar",
  "desconto.aprovar",
  "desconto.abaixo_margem",
  "venda.cancelar",
  "venda.devolver",
  "estoque.estornar",
  "venda.editar_concluida",
  "dashboard.descontos.ver",
  "os.criar_cliente_forcado",
  "estoque.saldo_negativo",
];

const ALCADAS = [
  { cargo: "membro", limite_percentual: 0, margem_minima_percentual: 15, pode_aprovar_acima: false },
  { cargo: "supervisor_operacao", limite_percentual: 5, margem_minima_percentual: 10, pode_aprovar_acima: true },
  { cargo: "gerente_operacao", limite_percentual: 15, margem_minima_percentual: 5, pode_aprovar_acima: true },
  { cargo: "admin", limite_percentual: 30, margem_minima_percentual: 0, pode_aprovar_acima: true },
  { cargo: "owner", limite_percentual: 100, margem_minima_percentual: 0, pode_aprovar_acima: true },
];

function allowedFor(role, key) {
  if (role === "owner" || role === "admin") return true;
  if (role === "manager") return key !== "venda.editar_concluida";
  return ["venda_rapida.criar", "venda_rapida.sem_cliente", "venda.cancelar"].includes(key);
}

console.log(`\nSeed oficina — tenant ${TENANT_SLUG}\n`);

const { data: tenant, error: tErr } = await admin
  .from("tenants")
  .select("id, slug, name")
  .eq("slug", TENANT_SLUG)
  .maybeSingle();

if (tErr || !tenant) {
  console.error("Tenant não encontrado:", tErr?.message ?? TENANT_SLUG);
  process.exit(1);
}

console.log(`  Tenant: ${tenant.name} (${tenant.id})`);

// 1) Consumidor balcão
let consumidorId;
{
  const { data: existing } = await admin
    .from("clientes")
    .select("id, nome")
    .eq("tenant_id", tenant.id)
    .eq("origem", "sistema_balcao")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    consumidorId = existing.id;
    console.log(`  OK  ensure_consumidor_balcao (já existia) ${consumidorId}`);
  } else {
    const { data: created, error } = await admin
      .from("clientes")
      .insert({
        tenant_id: tenant.id,
        nome: "Consumidor não identificado",
        tipo_pessoa: "pf",
        origem: "sistema_balcao",
        estagio_funil: "fechado",
        ativo: true,
        observacoes: "Cliente sistema para vendas de balcão sem identificação.",
      })
      .select("id")
      .single();
    if (error) {
      console.error("  FAIL ensure_consumidor_balcao:", error.message);
      process.exit(1);
    }
    consumidorId = created.id;
    console.log(`  OK  ensure_consumidor_balcao (criado) ${consumidorId}`);
  }
}

// 2) Alçadas
{
  let inserted = 0;
  for (const a of ALCADAS) {
    const { error } = await admin.from("desconto_alcadas").upsert(
      {
        tenant_id: tenant.id,
        cargo: a.cargo,
        limite_percentual: a.limite_percentual,
        margem_minima_percentual: a.margem_minima_percentual,
        pode_aprovar_acima: a.pode_aprovar_acima,
        ativo: true,
      },
      { onConflict: "tenant_id,cargo", ignoreDuplicates: true },
    );
    if (error) {
      const { data: ex } = await admin
        .from("desconto_alcadas")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("cargo", a.cargo)
        .maybeSingle();
      if (!ex) {
        const { error: iErr } = await admin.from("desconto_alcadas").insert({
          tenant_id: tenant.id,
          ...a,
          ativo: true,
        });
        if (iErr) {
          console.error(`  FAIL alçada ${a.cargo}:`, iErr.message);
          process.exit(1);
        }
        inserted += 1;
      }
    } else {
      inserted += 1;
    }
  }
  void inserted;
  const { count } = await admin
    .from("desconto_alcadas")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);
  console.log(
    `  OK  seed_desconto_alcadas_padrao (${count} linhas, upsert ok)`,
  );
}

// 3) Permissões
{
  const roles = ["owner", "admin", "manager", "member"];
  let ops = 0;
  for (const role of roles) {
    for (const key of PERMISSION_KEYS) {
      const { data: ex } = await admin
        .from("tenant_role_permissions")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("role", role)
        .eq("permission_key", key)
        .maybeSingle();
      if (ex) continue;
      const { error } = await admin.from("tenant_role_permissions").insert({
        tenant_id: tenant.id,
        role,
        permission_key: key,
        allowed: allowedFor(role, key),
      });
      if (error) {
        console.error(`  FAIL perm ${role}/${key}:`, error.message);
        process.exit(1);
      }
      ops += 1;
    }
  }
  const { count } = await admin
    .from("tenant_role_permissions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);
  console.log(
    `  OK  seed_role_permissions_padrao (${count} linhas, +${ops} novas)`,
  );
}

// Re-run idempotency check
{
  const { data: again } = await admin
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("origem", "sistema_balcao")
    .is("deleted_at", null);
  if ((again?.length ?? 0) !== 1) {
    console.error("  FAIL idempotência consumidor: esperado 1, got", again?.length);
    process.exit(1);
  }
  console.log("  OK  idempotência consumidor_balcao (1 registro)");
}

console.log("\nSeeds concluídos com sucesso.\n");
