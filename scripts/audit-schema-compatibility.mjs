/**
 * Release Gate 13.17 — Auditoria de compatibilidade de schema (somente leitura).
 *
 * Uso:
 *   npm run audit:schema
 *   npm run audit:schema -- --live
 *
 * Nunca altera o banco. Nunca imprime secrets. Não bloqueia o build.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SCHEMA_EXPECTATIONS = [
  {
    table: "clientes",
    columns: ["razao_social", "segmento", "porte", "origem", "deleted_at", "tenant_id"],
    migration: "20260719 / 20260721",
    critical: true,
  },
  {
    table: "fornecedores",
    columns: [
      "nome_fantasia",
      "tipo_pessoa",
      "categoria_financeira_id",
      "plano_conta_id",
      "centro_custo_id",
      "forma_pagamento_id",
      "conta_bancaria_id",
      "recorrente",
      "frequencia",
      "deleted_at",
    ],
    migration: "20260719 / 20260721",
    critical: true,
  },
  {
    table: "contas_pagar_rateios",
    columns: [
      "descricao",
      "deleted_at",
      "updated_at",
      "percentual",
      "valor",
      "centro_custo_id",
      "conta_pagar_id",
      "tenant_id",
    ],
    migration: "20260717 / 20260721",
    critical: true,
    notes: "descricao é opcional (nullable), mas a coluna deve existir.",
  },
  {
    table: "contas_pagar",
    columns: [
      "data_competencia",
      "valor_pago",
      "status",
      "deleted_at",
      "grupo_parcelamento_id",
      "despesa_recorrente_id",
    ],
    migration: "20260708 / 20260717 / 20260722",
    critical: true,
  },
  {
    table: "contas_receber",
    columns: [
      "data_competencia",
      "valor_recebido",
      "status",
      "deleted_at",
      "grupo_parcelamento_id",
      "venda_id",
    ],
    migration: "20260708 / 20260712",
    critical: true,
  },
  {
    table: "movimentacoes_bancarias",
    columns: [
      "conta_pagar_id",
      "conta_receber_id",
      "estornada_por_id",
      "movimentacao_estornada_id",
      "origem",
      "tipo",
    ],
    migration: "20260708 / 20260709",
    critical: true,
  },
  {
    table: "financeiro_lancamento_eventos",
    columns: [
      "entity_type",
      "entity_id",
      "action",
      "motivo",
      "payload_antes",
      "payload_depois",
      "user_id",
      "tenant_id",
    ],
    migration: "20260720 / 20260721",
    critical: false,
  },
  {
    table: "tags",
    columns: ["nome", "slug", "cor", "ativo", "deleted_at", "tenant_id"],
    migration: "20260719 / 20260721",
    critical: false,
  },
  {
    table: "entity_tags",
    columns: ["tag_id", "entity_type", "entity_id", "tenant_id"],
    migration: "20260719 / 20260721",
    critical: false,
  },
  {
    table: "centros_custo",
    columns: ["tipo", "departamento", "unidade", "filial"],
    migration: "20260719 / 20260721",
    critical: false,
  },
  {
    table: "categorias_financeiras",
    columns: ["dre_linha", "dre_detalhe", "deleted_at"],
    migration: "20260717 / 20260718",
    critical: true,
  },
  {
    table: "plano_contas",
    columns: ["dre_linha", "dre_detalhe", "deleted_at"],
    migration: "20260717 / 20260718",
    critical: true,
  },
  {
    table: "despesas_recorrentes",
    columns: [
      "proxima_competencia",
      "ocorrencias_geradas",
      "pausada",
      "ativo",
      "deleted_at",
    ],
    migration: "20260717 / 20260722",
    critical: true,
  },
  {
    table: "veiculos",
    columns: [
      "tenant_id",
      "cliente_id",
      "placa",
      "marca",
      "modelo",
      "versao",
      "ano",
      "cor",
      "combustivel",
      "cambio",
      "quilometragem",
      "chassi",
      "observacoes",
      "ativo",
      "deleted_at",
    ],
    migration: "20260713 / 20260723_fix",
    critical: true,
    notes: "Base OS. Criada pelo fix se 20260713 não aplicada.",
  },
  {
    table: "ordens_servico",
    columns: [
      "tenant_id",
      "cliente_id",
      "veiculo_id",
      "status",
      "previsao_entrega",
      "venda_id",
      "subtotal",
      "desconto_total",
      "acrescimo_total",
      "prioridade",
      "faturado_em",
      "deleted_at",
    ],
    migration: "20260713 / 20260723_fix",
    critical: true,
  },
  {
    table: "ordem_servico_itens",
    columns: [
      "tenant_id",
      "ordem_servico_id",
      "categoria_item",
      "aprovacao_status",
      "estoque_status",
      "execucao_status",
      "desconto",
      "acrescimo",
      "deleted_at",
    ],
    migration: "20260713 / 20260723_fix",
    critical: true,
  },
  {
    table: "retornos_servico",
    columns: [
      "tenant_id",
      "ordem_servico_id",
      "tipo_retorno",
      "tipo_cobertura",
      "deleted_at",
    ],
    migration: "20260713 / 20260723_fix",
    critical: false,
  },
  {
    table: "ordem_servico_checklist",
    columns: ["tenant_id", "ordem_servico_id", "item_codigo", "status", "deleted_at"],
    migration: "20260723_fix",
    critical: false,
  },
  {
    table: "ordem_servico_diagnosticos",
    columns: ["tenant_id", "ordem_servico_id", "diagnostico_tecnico", "deleted_at"],
    migration: "20260723_fix",
    critical: false,
  },
  {
    table: "ordem_servico_anexos",
    columns: ["tenant_id", "ordem_servico_id", "etapa", "tipo", "deleted_at"],
    migration: "20260723_fix",
    critical: false,
  },
  {
    table: "ordem_servico_eventos",
    columns: ["tenant_id", "ordem_servico_id", "tipo", "descricao", "created_at"],
    migration: "20260723_fix",
    critical: false,
  },
  {
    table: "ordem_servico_previsoes",
    columns: ["tenant_id", "ordem_servico_id", "previsao_nova", "created_at"],
    migration: "20260723_fix",
    critical: false,
  },
  {
    table: "notas_fiscais_entrada",
    columns: [
      "tenant_id",
      "chave_acesso",
      "xml_hash",
      "fornecedor_id",
      "status",
      "gerar_conta_pagar",
      "conta_pagar_id",
      "deleted_at",
    ],
    migration: "20260725_nfe_entrada_importacao",
    critical: true,
  },
  {
    table: "notas_fiscais_entrada_itens",
    columns: [
      "tenant_id",
      "nota_fiscal_id",
      "destino",
      "quantidade",
      "quantidade_estoque",
      "quantidade_os",
      "produto_id",
      "ordem_servico_id",
      "custo_unitario_final",
      "deleted_at",
    ],
    migration: "20260725_nfe_entrada_importacao",
    critical: true,
  },
  {
    table: "notas_fiscais_entrada_eventos",
    columns: ["tenant_id", "nota_fiscal_id", "tipo", "descricao", "user_id"],
    migration: "20260725_nfe_entrada_importacao",
    critical: true,
  },
  {
    table: "fornecedor_produto_vinculos",
    columns: [
      "tenant_id",
      "fornecedor_id",
      "produto_id",
      "codigo_fornecedor",
      "deleted_at",
    ],
    migration: "20260725_nfe_entrada_importacao",
    critical: true,
  },
];

const RPC_EXPECTATIONS = [
  {
    name: "baixar_conta_pagar_atomico",
    migration: "20260709_rpc_baixar_contas_atomico",
    critical: true,
  },
  {
    name: "baixar_conta_receber_atomico",
    migration: "20260709_rpc_baixar_contas_atomico",
    critical: true,
  },
  {
    name: "estornar_movimentacao_bancaria_atomico",
    migration: "20260709_rpc_motor_transacional_financeiro",
    critical: true,
  },
  {
    name: "processar_nfe_entrada_atomico",
    migration: "20260725_nfe_processar_rpc",
    critical: true,
    args: {
      p_tenant_id: "00000000-0000-0000-0000-000000000000",
      p_nota_id: "00000000-0000-0000-0000-000000000000",
      p_user_id: null,
    },
  },
];

function loadDotEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function printCatalog() {
  console.log("=== SCHEMA EXPECTATIONS (código → migration) ===\n");
  console.log("Entidade | Campo | Migration | Crítico | Notas");
  console.log("-".repeat(72));
  for (const row of SCHEMA_EXPECTATIONS) {
    for (const col of row.columns) {
      console.log(
        `${row.table} | ${col} | ${row.migration} | ${row.critical ? "sim" : "não"} | ${row.notes ?? ""}`,
      );
    }
  }
  console.log("\n=== RPCs ESPERADAS ===\n");
  for (const rpc of RPC_EXPECTATIONS) {
    console.log(
      `${rpc.name} | ${rpc.migration} | crítico=${rpc.critical ? "sim" : "não"}`,
    );
  }
}

async function probeLive() {
  loadDotEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return {
      results: [],
      skipped: true,
      reason:
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes — probe live não executado.",
    };
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = [];

  for (const table of SCHEMA_EXPECTATIONS) {
    for (const column of table.columns) {
      const { error } = await supabase.from(table.table).select(column).limit(0);
      if (!error) {
        results.push({
          table: table.table,
          column,
          ok: true,
          critical: table.critical,
          migration: table.migration,
        });
        continue;
      }

      const detail = error.message;
      const missing = /could not find|does not exist|schema cache/i.test(detail);

      results.push({
        table: table.table,
        column,
        ok: !missing,
        detail,
        critical: table.critical,
        migration: table.migration,
      });
    }
  }

  for (const rpc of RPC_EXPECTATIONS) {
    // Sem args tipados: PostgREST diz "without parameters" tanto para ausente
    // quanto para assinatura errada — trate como presente se a mensagem indicar
    // mismatch de parâmetros (função conhecida no schema cache).
    const { error } = await supabase.rpc(rpc.name, rpc.args ?? {});
    const msg = (error?.message ?? "").toLowerCase();
    const code = error?.code ?? "";

    let absent = false;
    if (rpc.args) {
      absent =
        code === "PGRST202" ||
        code === "PGRST204" ||
        /could not find the function|schema cache|does not exist/i.test(msg);
      // Erros de negócio (P0001 / nao_autenticado) = função existe
      if (code === "P0001" || /nao_autenticado|tenant_negado|parametros/i.test(msg)) {
        absent = false;
      }
    } else {
      const knownMismatch =
        msg.includes("without parameters") ||
        (msg.includes("function") &&
          (msg.includes("argument") || msg.includes("named") || msg.includes("with")));
      absent =
        !knownMismatch &&
        (code === "PGRST202" ||
          code === "PGRST204" ||
          /could not find the function|does not exist/i.test(msg));
    }

    results.push({
      table: "rpc",
      column: rpc.name,
      ok: !absent,
      detail: error?.message,
      critical: rpc.critical,
      migration: rpc.migration,
    });
  }

  return { results, skipped: false };
}

async function main() {
  const live = process.argv.includes("--live");
  printCatalog();

  if (!live) {
    console.log(
      "\n(Info) Sem --live: apenas catálogo estático. Para sondar o remoto: npm run audit:schema -- --live\n",
    );
    process.exit(0);
  }

  console.log("\n=== PROBE LIVE (somente leitura) ===\n");
  const { results, skipped, reason } = await probeLive();
  if (skipped) {
    console.log(`SKIP: ${reason}`);
    process.exit(0);
  }

  const failures = results.filter((r) => !r.ok);
  const criticalFailures = failures.filter((r) => r.critical);

  for (const r of failures) {
    console.log(
      `FAIL ${r.table}.${r.column} [${r.migration}] crítico=${r.critical ? "sim" : "não"}`,
    );
    if (r.detail) console.log(`  → ${r.detail}`);
  }

  if (failures.length === 0) {
    console.log(
      "OK: todas as colunas/RPCs sondadas responderam de forma compatível (ou RLS bloqueou sem indicar coluna ausente).\n",
    );
    console.log(
      "Nota: probe com ANON key sem sessão — ausência de coluna ainda é detectável; dados protegidos por RLS não são vazados.\n",
    );
    process.exit(0);
  }

  console.log(
    `\nResumo: ${failures.length} inconsistência(s), ${criticalFailures.length} crítica(s).`,
  );
  if (criticalFailures.length > 0) {
    console.log(
      "Ação: se falhas forem de veiculos/ordens_servico, execute 20260723_fix_oficina_os_enterprise.sql e NOTIFY pgrst, 'reload schema'; Caso contrário, revise hotfixes 20260721/20260722.\n",
    );
    process.exit(2);
  }

  process.exit(1);
}

main().catch((error) => {
  console.error("Auditoria falhou:", error instanceof Error ? error.message : error);
  process.exit(1);
});
