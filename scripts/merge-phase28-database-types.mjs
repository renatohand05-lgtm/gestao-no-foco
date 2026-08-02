#!/usr/bin/env node
/**
 * Sprint 28.7 — Mescla tipagem Phase 28 em types/database.ts
 * Fonte: migrations 20260802_phase28_* + probe runtime.
 * Nota: `supabase gen types` exige SUPABASE_ACCESS_TOKEN (indisponível aqui).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve("types/database.ts");
let src = readFileSync(path, "utf8");
const log = [];

function replaceOnce(label, find, replace) {
  if (!src.includes(find)) {
    throw new Error(`Anchor não encontrado: ${label}`);
  }
  if (src.includes(replace.trim().slice(0, 40)) && label.includes("SKIP_IF")) {
    log.push(`SKIP ${label}`);
    return;
  }
  src = src.replace(find, replace);
  log.push(`OK ${label}`);
}

// —— clientes ——
if (!src.includes("consentimento_contato:")) {
  replaceOnce(
    "clientes.Row Phase28",
    "          estagio_funil: string;\n          empresa_id: string | null;",
    `          estagio_funil: string;
          consentimento_contato: boolean;
          origem_contato_detalhe: string | null;
          prioridade_crm: string | null;
          valor_potencial: number | null;
          proxima_acao: string | null;
          data_proxima_acao: string | null;
          empresa_id: string | null;`,
  );
  replaceOnce(
    "clientes.Insert Phase28",
    "          estagio_funil?: string;\n          empresa_id?: string | null;",
    `          estagio_funil?: string;
          consentimento_contato?: boolean;
          origem_contato_detalhe?: string | null;
          prioridade_crm?: string | null;
          valor_potencial?: number | null;
          proxima_acao?: string | null;
          data_proxima_acao?: string | null;
          empresa_id?: string | null;`,
  );
  // Update block — same pattern as Insert for estagio_funil
  const updateAnchor =
    "          estagio_funil?: string;\n          empresa_id?: string | null;\n          nome_fantasia?: string | null;";
  if (src.includes(updateAnchor) && !src.includes("prioridade_crm?: string | null;\n          valor_potencial")) {
    // Insert already replaced first occurrence; Update still has original
    src = src.replace(
      updateAnchor,
      `          estagio_funil?: string;
          consentimento_contato?: boolean;
          origem_contato_detalhe?: string | null;
          prioridade_crm?: string | null;
          valor_potencial?: number | null;
          proxima_acao?: string | null;
          data_proxima_acao?: string | null;
          empresa_id?: string | null;
          nome_fantasia?: string | null;`,
    );
    log.push("OK clientes.Update Phase28");
  }
} else {
  log.push("SKIP clientes Phase28");
}

// —— crm_oportunidades ——
{
  const start = src.indexOf("      crm_oportunidades: {");
  const end = src.indexOf("      crm_stage_movements: {");
  const block = src.slice(start, end);
  if (!block.includes("centro_custo_id:")) {
    src = src.replace(
      "      crm_oportunidades: {\n        Row: {\n          id: string;\n          tenant_id: string;\n          cliente_id: string;\n          empresa_id: string | null;\n          filial_id: string | null;\n          titulo: string;\n          stage_key: string;\n          valor_estimado: number | null;\n          probabilidade: number | null;\n          data_prevista: string | null;\n          data_fechamento: string | null;\n          origem: string | null;\n          responsavel_id: string | null;\n          produto_servico: string | null;\n          status: string;\n          motivo_perda: string | null;\n          created_by: string | null;",
      `      crm_oportunidades: {
        Row: {
          id: string;
          tenant_id: string;
          cliente_id: string;
          empresa_id: string | null;
          filial_id: string | null;
          titulo: string;
          stage_key: string;
          valor_estimado: number | null;
          probabilidade: number | null;
          data_prevista: string | null;
          data_fechamento: string | null;
          origem: string | null;
          responsavel_id: string | null;
          produto_servico: string | null;
          status: string;
          motivo_perda: string | null;
          centro_custo_id: string | null;
          tags: string[] | null;
          created_by: string | null;`,
    );
    // Insert / Update — add before created_by optional in each
    const oppStart = src.indexOf("      crm_oportunidades: {");
    const oppEnd = src.indexOf("      crm_stage_movements: {");
    let opp = src.slice(oppStart, oppEnd);
    if (!opp.includes("centro_custo_id?:")) {
      opp = opp.replace(
        /motivo_perda\?: string \| null;\n          created_by\?:/g,
        "motivo_perda?: string | null;\n          centro_custo_id?: string | null;\n          tags?: string[] | null;\n          created_by?:",
      );
      src = src.slice(0, oppStart) + opp + src.slice(oppEnd);
    }
    log.push("OK crm_oportunidades Phase28");
  } else {
    log.push("SKIP crm_oportunidades Phase28");
  }
}

// —— ordens_servico ——
{
  const start = src.indexOf("      ordens_servico: {");
  const end = src.indexOf("\n      ", start + 10);
  // find next table at same indent after a large block — use recurso_id as end of Row
  if (!src.slice(start, start + 12000).includes("tipo_ordem:")) {
    src = src.replace(
      "      ordens_servico: {\n        Row: {\n          id: string;\n          tenant_id: string;\n          numero: number;\n          cliente_id: string;\n          veiculo_id: string | null;\n          status: string;",
      `      ordens_servico: {
        Row: {
          id: string;
          tenant_id: string;
          numero: number;
          cliente_id: string;
          veiculo_id: string | null;
          status: string;
          tipo_ordem: string;
          template_key: string | null;`,
    );
    src = src.replace(
      "          veiculo_id?: string | null;\n          status?: string;\n          mecanico_id?: string | null;",
      "          veiculo_id?: string | null;\n          status?: string;\n          tipo_ordem?: string;\n          template_key?: string | null;\n          mecanico_id?: string | null;",
    );
    // second occurrence for Update
    const first = src.indexOf(
      "          veiculo_id?: string | null;\n          status?: string;\n          tipo_ordem?: string;",
    );
    const second = src.indexOf(
      "          veiculo_id?: string | null;\n          status?: string;\n          mecanico_id?: string | null;",
      first + 10,
    );
    if (second > 0) {
      src =
        src.slice(0, second) +
        "          veiculo_id?: string | null;\n          status?: string;\n          tipo_ordem?: string;\n          template_key?: string | null;\n          mecanico_id?: string | null;" +
        src.slice(
          second +
            "          veiculo_id?: string | null;\n          status?: string;\n          mecanico_id?: string | null;"
              .length,
        );
    }
    log.push("OK ordens_servico.tipo_ordem");
  } else {
    log.push("SKIP ordens_servico.tipo_ordem");
  }
}

const phase28Tables = `      agenda_eventos: {
        Row: {
          id: string;
          tenant_id: string;
          titulo: string;
          tipo: string;
          status: string;
          inicio: string;
          fim: string;
          dia_inteiro: boolean;
          responsavel_id: string | null;
          recurso_id: string | null;
          cliente_id: string | null;
          ordem_servico_id: string | null;
          venda_id: string | null;
          origem: string | null;
          observacao: string | null;
          endereco: string | null;
          recorrencia_json: Json | null;
          override_conflito: boolean;
          override_justificativa: string | null;
          empresa_id: string | null;
          filial_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          titulo: string;
          tipo?: string;
          status?: string;
          inicio: string;
          fim: string;
          dia_inteiro?: boolean;
          responsavel_id?: string | null;
          recurso_id?: string | null;
          cliente_id?: string | null;
          ordem_servico_id?: string | null;
          venda_id?: string | null;
          origem?: string | null;
          observacao?: string | null;
          endereco?: string | null;
          recorrencia_json?: Json | null;
          override_conflito?: boolean;
          override_justificativa?: string | null;
          empresa_id?: string | null;
          filial_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          titulo?: string;
          tipo?: string;
          status?: string;
          inicio?: string;
          fim?: string;
          dia_inteiro?: boolean;
          responsavel_id?: string | null;
          recurso_id?: string | null;
          cliente_id?: string | null;
          ordem_servico_id?: string | null;
          venda_id?: string | null;
          origem?: string | null;
          observacao?: string | null;
          endereco?: string | null;
          recorrencia_json?: Json | null;
          override_conflito?: boolean;
          override_justificativa?: string | null;
          empresa_id?: string | null;
          filial_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      agenda_recursos: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          tipo: string;
          capacidade: number;
          ativo: boolean;
          empresa_id: string | null;
          filial_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          tipo?: string;
          capacidade?: number;
          ativo?: boolean;
          empresa_id?: string | null;
          filial_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          tipo?: string;
          capacidade?: number;
          ativo?: boolean;
          empresa_id?: string | null;
          filial_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      centros_resultado: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          codigo: string | null;
          responsavel_id: string | null;
          filial_id: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          codigo?: string | null;
          responsavel_id?: string | null;
          filial_id?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          codigo?: string | null;
          responsavel_id?: string | null;
          filial_id?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      finance_budget_lines: {
        Row: {
          id: string;
          tenant_id: string;
          budget_id: string;
          mes: number;
          natureza: string;
          categoria_id: string | null;
          centro_custo_id: string | null;
          centro_resultado_id: string | null;
          plano_conta_id: string | null;
          valor_orcado: number;
          justificativa: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          budget_id: string;
          mes: number;
          natureza?: string;
          categoria_id?: string | null;
          centro_custo_id?: string | null;
          centro_resultado_id?: string | null;
          plano_conta_id?: string | null;
          valor_orcado?: number;
          justificativa?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          budget_id?: string;
          mes?: number;
          natureza?: string;
          categoria_id?: string | null;
          centro_custo_id?: string | null;
          centro_resultado_id?: string | null;
          plano_conta_id?: string | null;
          valor_orcado?: number;
          justificativa?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      finance_budgets: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          ano: number;
          versao: number;
          status: string;
          empresa_id: string | null;
          filial_id: string | null;
          observacao: string | null;
          aprovado_por: string | null;
          aprovado_em: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          ano: number;
          versao?: number;
          status?: string;
          empresa_id?: string | null;
          filial_id?: string | null;
          observacao?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          ano?: number;
          versao?: number;
          status?: string;
          empresa_id?: string | null;
          filial_id?: string | null;
          observacao?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      ordem_trabalho_templates: {
        Row: {
          id: string;
          tenant_id: string;
          key: string;
          nome: string;
          tipo_ordem: string;
          campos_json: Json;
          checklist_json: Json;
          etapas_json: Json;
          ativo: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          key: string;
          nome: string;
          tipo_ordem: string;
          campos_json?: Json;
          checklist_json?: Json;
          etapas_json?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          key?: string;
          nome?: string;
          tipo_ordem?: string;
          campos_json?: Json;
          checklist_json?: Json;
          etapas_json?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
`;

if (!src.includes("agenda_eventos:") || !src.includes("finance_budgets:")) {
  const anchor = "      crm_oportunidades: {";
  const idx = src.indexOf(anchor);
  if (idx < 0) throw new Error("anchor crm_oportunidades");
  src = src.slice(0, idx) + phase28Tables + src.slice(idx);
  log.push("OK tabelas Phase 28");
} else {
  log.push("SKIP tabelas Phase 28");
}

writeFileSync(path, src, "utf8");
for (const l of log) console.log(l);
console.log("\nmerge-phase28-database-types done\n");
