#!/usr/bin/env node
/**
 * Hotfix UX — fluxo rápido unificado (cliente + veículo + serviço + OS).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

const ENGINE = { segmentVersion: 1 };

const GUARD_FILES = [
  "components/ordens/os-open-form.tsx",
  "components/agenda/agenda-event-create-form.tsx",
  "components/clientes/quick-client-create.tsx",
  "components/clientes/cliente-form.tsx",
  "lib/ordens/actions.ts",
  "lib/clientes/relationship.ts",
];

describe("unified operational input — source of truth", () => {
  it("componentes reutilizáveis existem", () => {
    assert.ok(existsSync(join(root, "components/clientes/quick-client-create.tsx")));
    assert.ok(
      existsSync(join(root, "components/clientes/relationship-type-selector.tsx")),
    );
    assert.ok(existsSync(join(root, "lib/clientes/relationship.ts")));
    const picker = read("components/agenda/agenda-service-field.tsx");
    assert.match(picker, /export function ServicePicker/);
    assert.match(picker, /export function AgendaServiceField/);
    assert.match(picker, /multiple/);
    assert.match(picker, /Escolher das sugestões/);
    assert.match(picker, /\+ Criar serviço/);
  });

  it("não toca billing, mass comm, cron live nem 35.3", () => {
    for (const f of GUARD_FILES) {
      const src = read(f);
      assert.doesNotMatch(src, /asaas/i);
      assert.doesNotMatch(src, /stripe/i);
      assert.doesNotMatch(src, /COMMUNICATION_MODE\s*=\s*["']live["']/);
      assert.doesNotMatch(src, /35\.3/);
    }
    const cron = read("lib/retention/process.ts");
    assert.match(cron, /dry_run/);
  });

  it("consultoria permanece fora de NEW_PRODUCT_IDS", () => {
    const resolve = read("lib/segments/resolve.ts");
    const block = resolve.match(/const NEW_PRODUCT_IDS[\s\S]*?\];/)?.[0] ?? "";
    assert.match(block, /lava_rapido/);
    assert.doesNotMatch(block, /consultoria/);
  });
});

describe("LAVA / OFICINA — service picker na abertura", () => {
  it("1-4 lava: nova OS carrega catálogo do tenant, múltiplos serviços, sugestões", async () => {
    const nova = read("app/(app)/[tenant]/ordens/nova/page.tsx");
    assert.match(nova, /createProdutoService/);
    assert.match(nova, /tipo: "servico"/);
    assert.match(nova, /serviceSuggestionsForContext/);
    assert.match(nova, /showVehicles=\{ui\.showVehicles\}/);
    const form = read("components/ordens/os-open-form.tsx");
    assert.match(form, /AgendaServiceField/);
    assert.match(form, /multiple/);
    assert.match(form, /servico_ids/);
    assert.match(form, /data-os-open="services"/);
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /attachScheduledCatalogItem/);
    assert.match(actions, /eq\("tenant_id"/);
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    assert.equal(lava.showVehicles, true);
    assert.equal(lava.compactVehicleVitals, true);
  });

  it("5-8 lava: cliente rápido + veículo no mesmo fluxo, checklist reusa veículo", () => {
    const form = read("components/ordens/os-open-form.tsx");
    assert.match(form, /Novo cliente/);
    assert.match(form, /novo_nome/);
    assert.match(form, /novo_whatsapp/);
    assert.match(form, /novo_modelo/);
    assert.match(form, /compactCreate/);
    assert.doesNotMatch(form, /name="novo_placa" required/);
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /applyChecklistTemplate/);
    assert.match(actions, /createVeiculoService/);
    const checklist = read("lib/ordens/ordem-servico-service.ts");
    assert.match(checklist, /applyChecklistTemplate/);
  });

  it("9-12 oficina: serviços + mecânico + diagnóstico preservados", async () => {
    const form = read("components/ordens/os-open-form.tsx");
    assert.match(form, /reclamacao_cliente/);
    assert.match(form, /showMechanic/);
    assert.match(form, /mecanico_id/);
    const nova = read("app/(app)/[tenant]/ordens/nova/page.tsx");
    assert.match(nova, /automotiveWorkflow/);
    assert.match(nova, /createMecanicoService/);
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const oficina = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(oficina.automotiveWorkflow, true);
    assert.equal(oficina.showVehicles, true);
    assert.equal(oficina.compactVehicleVitals, false);
  });
});

describe("BARBEARIA / CONSULTORIA / ESTÉTICA / ODONTO", () => {
  it("13-15 barbearia: sem veículo, serviço selecionável, profissional na agenda", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const ui = getSegmentUiCopy({ segment: "barbearia", ...ENGINE });
    assert.equal(ui.showVehicles, false);
    const form = read("components/ordens/os-open-form.tsx");
    assert.match(form, /showVehicles \?/);
    const agenda = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(agenda, /AgendaServiceField/);
    assert.match(agenda, /profissionais/);
    assert.match(agenda, /showVehicles && natureza === "cliente"/);
  });

  it("16-18 consultoria: atendimento vs negócio com campos distintos", async () => {
    const { relationshipFromOrigem, origemForRelationship } = await load(
      "lib/clientes/relationship.ts",
    );
    assert.equal(relationshipFromOrigem("atendimento"), "atendimento");
    assert.equal(relationshipFromOrigem("negocio"), "negocio");
    assert.equal(relationshipFromOrigem("lead"), "negocio");
    assert.equal(origemForRelationship("negocio"), "negocio");
    const form = read("components/clientes/cliente-form.tsx");
    assert.match(form, /RelationshipTypeSelector/);
    assert.match(form, /Cadastro rápido comercial/);
    assert.match(form, /Nome \/ Razão social/);
    assert.match(form, /estagio_funil_quick/);
    const quick = read("components/clientes/quick-client-create.tsx");
    assert.match(quick, /allowBusiness/);
    assert.match(quick, /estagio_funil/);
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    assert.equal(
      getSegmentUiCopy({ segment: "consultoria", ...ENGINE }).showVehicles,
      false,
    );
  });

  it("19-20 estética/odonto: cliente rápido simples, sem veículo", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    for (const segment of ["clinica_estetica", "consultorio_odontologico"]) {
      const ui = getSegmentUiCopy({ segment, ...ENGINE });
      assert.equal(ui.showVehicles, false);
      assert.equal(ui.automotiveWorkflow, false);
    }
    const cliente = read("components/clientes/cliente-form.tsx");
    assert.match(cliente, /data-fast-input="essentials"/);
    assert.match(cliente, /Mais informações/);
    assert.match(cliente, /documento/);
  });
});

describe("UX — progressive disclosure, contexto, dedupe, mobile", () => {
  it("21 progressive disclosure: atendimento sem CRM enterprise aberto", () => {
    const form = read("components/clientes/cliente-form.tsx");
    assert.match(form, /Mais informações/);
    assert.match(form, /score/);
    assert.match(form, /consultor_id/);
    const essentials = form.slice(
      form.indexOf('data-fast-input="essentials"'),
      form.indexOf("FastInputCtaBar"),
    );
    assert.doesNotMatch(essentials, /htmlFor="documento"/);
    assert.doesNotMatch(essentials, /htmlFor="score"/);
    assert.doesNotMatch(essentials, /htmlFor="consultor_id"/);
    assert.doesNotMatch(essentials, /htmlFor="probabilidade"/);
  });

  it("22 contexto preservado: salvar e usar na agenda e na OS", () => {
    const agenda = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(agenda, /QuickClientCreate/);
    assert.match(agenda, /setClienteId\(id\)/);
    assert.match(agenda, /novoClienteFromAgendaHref/);
    const os = read("components/ordens/os-open-form.tsx");
    assert.match(os, /sem sair desta tela/);
    assert.match(os, /onSelectMany/);
  });

  it("23 dedupe por telefone/email/documento, não só nome", () => {
    const quick = read("components/clientes/quick-client-create.tsx");
    assert.match(quick, /checkClienteDuplicatesAction/);
    assert.match(quick, /Cliente já existente\?/);
    assert.doesNotMatch(quick, /nome.*hasDuplicates/);
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /checkDuplicates/);
    assert.match(actions, /documento:/);
    assert.match(actions, /email:/);
    assert.match(actions, /telefone:/);
  });

  it("24 mobile: steps curtos no open form", () => {
    const form = read("components/ordens/os-open-form.tsx");
    assert.match(form, /data-os-mobile-steps/);
    assert.match(form, /data-os-step="cliente"/);
    assert.match(form, /data-os-step="veiculo"/);
    assert.match(form, /data-os-step="servico"/);
    assert.match(form, /data-os-step="confirmar"/);
    assert.match(form, /sm:hidden/);
  });
});

describe("360, isolation, RBAC", () => {
  it("client 360 não mistura modos", async () => {
    const { visibleClient360Tabs } = await load("lib/segments/client-360.ts");
    const att = visibleClient360Tabs({
      showVehicles: true,
      showWorkOrders: true,
      hasExecutivo: true,
      relationship: "atendimento",
    });
    assert.equal(att.includes("veiculos"), true);
    assert.equal(att.includes("ordens"), true);
    assert.equal(att.includes("executivo"), false);
    assert.equal(att.includes("tarefas"), false);
    const biz = visibleClient360Tabs({
      showVehicles: true,
      showWorkOrders: true,
      hasExecutivo: true,
      relationship: "negocio",
    });
    assert.equal(biz.includes("veiculos"), false);
    assert.equal(biz.includes("ordens"), false);
    assert.equal(biz.includes("executivo"), true);
    assert.equal(biz.includes("tarefas"), true);
    const workspace = read("components/clientes/cliente-workspace.tsx");
    assert.match(workspace, /relationshipFromOrigem/);
    assert.doesNotMatch(workspace, /if \(segment ===/);
  });

  it("25-28 tenant isolation + RBAC na OS integrada", () => {
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /require\("os\.criar"/);
    assert.match(actions, /eq\("tenant_id", tenant\.id\)/);
    const attach = read("lib/ordens/ordem-servico-service.ts");
    assert.match(attach, /eq\("id", produtoId\)/);
    assert.match(attach, /eq\("tenant_id", this\.tenantId\)/);
    const veiculo = read("lib/ordens/veiculo-service.ts");
    assert.match(veiculo, /eq\("tenant_id"/);
    const nova = read("app/(app)/[tenant]/ordens/nova/page.tsx");
    assert.match(nova, /tryResolvePermissions/);
    assert.match(nova, /os\.criar/);
  });
});
