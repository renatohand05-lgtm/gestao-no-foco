#!/usr/bin/env node
/**
 * Sprint 35.2.1 hotfix — sugestões oficiais de serviço no cadastro rápido e na Agenda.
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

function blob(items) {
  return items.map((item) => `${item.name} ${item.category}`).join(" | ");
}

function names(items) {
  return items.map((item) => item.name);
}

async function suggestions(segment, extra = {}, options) {
  const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
  const { serviceSuggestionsForContext } = await load(
    "lib/segments/catalogs/suggest.ts",
  );
  const ctx = resolveSegmentContext({
    segment,
    ...ENGINE,
    ...extra,
  });
  return serviceSuggestionsForContext(ctx, options);
}

describe("35.2.1 hotfix — fonte única e isolamento de segmento", () => {
  it("1. barbearia recebe sugestões de barbearia", async () => {
    const items = await suggestions("barbearia");
    const list = names(items);
    assert.ok(list.includes("Corte tradicional"));
    assert.ok(list.includes("Corte infantil"));
    assert.ok(list.includes("Barba tradicional"));
    assert.ok(list.includes("Corte + barba"));
    assert.ok(list.includes("Acabamento"));
    assert.ok(list.includes("Hidratação capilar"));
    assert.ok(!list.includes("Pomada"));
    assert.ok(!list.includes("Óleo para barba"));
  });

  it("2. barbearia não recebe oficina", async () => {
    const { normalizeCatalogName } = await load(
      "lib/segments/catalogs/builder.ts",
    );
    const normalized = blob(await suggestions("barbearia"))
      .split("|")
      .map((part) => normalizeCatalogName(part))
      .join(" ");
    assert.doesNotMatch(normalized, /troca oleo/);
    assert.doesNotMatch(normalized, /alinhamento/);
    assert.doesNotMatch(normalized, /cambio/);
    assert.doesNotMatch(normalized, /caixa direcao/);
    assert.doesNotMatch(normalized, /lavagem tecnica automotiva/);
  });

  it("3. lava recebe sugestões de lava", async () => {
    const list = names(await suggestions("lava_rapido"));
    assert.ok(list.includes("Lavagem externa"));
    assert.ok(list.includes("Lavagem técnica"));
    assert.ok(list.includes("Higienização interna"));
  });

  it("4. lava não recebe diagnóstico/oficina nem barbearia", async () => {
    const { normalizeCatalogName } = await load(
      "lib/segments/catalogs/builder.ts",
    );
    const normalized = blob(await suggestions("lava_rapido"))
      .split("|")
      .map((part) => normalizeCatalogName(part))
      .join(" ");
    assert.doesNotMatch(normalized, /\bcorte\b/);
    assert.doesNotMatch(normalized, /\bbarba\b/);
    assert.doesNotMatch(normalized, /troca oleo/);
    assert.doesNotMatch(normalized, /diagnostico mecanico/);
  });

  it("5. consultoria recebe consultoria", async () => {
    const list = names(await suggestions("consultoria"));
    assert.ok(list.includes("Consultoria inicial"));
    assert.ok(list.includes("Consultoria estratégica"));
    assert.ok(list.includes("Diagnóstico empresarial"));
    const { normalizeCatalogName } = await load(
      "lib/segments/catalogs/builder.ts",
    );
    const normalized = blob(await suggestions("consultoria"))
      .split("|")
      .map((part) => normalizeCatalogName(part))
      .join(" ");
    assert.doesNotMatch(normalized, /\bcorte\b/);
    assert.doesNotMatch(normalized, /\bbarba\b/);
    assert.doesNotMatch(normalized, /\blavagem\b/);
    assert.doesNotMatch(normalized, /troca oleo/);
  });

  it("6. estética recebe estética", async () => {
    const list = names(await suggestions("clinica_estetica"));
    assert.ok(list.includes("Limpeza de pele"));
    assert.ok(list.includes("Peeling"));
    assert.ok(list.includes("Drenagem linfática"));
  });

  it("7. odontologia recebe odontologia", async () => {
    const list = names(await suggestions("consultorio_odontologico"));
    assert.ok(list.includes("Consulta inicial"));
    assert.ok(list.includes("Profilaxia / limpeza"));
    assert.ok(list.includes("Restauração"));
  });

  it("8. oficina preserva catálogo", async () => {
    const list = names(await suggestions("oficina"));
    assert.ok(list.includes("Troca de óleo do motor"));
    assert.ok(list.includes("Alinhamento"));
    assert.ok(list.includes("Diagnóstico de câmbio"));
    assert.ok(list.length >= 70);
  });

  it("9. tenant legado preservado", async () => {
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const { serviceSuggestionsForContext } = await load(
      "lib/segments/catalogs/suggest.ts",
    );
    const ctx = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: null,
    });
    assert.equal(ctx.usesCapabilityEngine, false);
    const items = serviceSuggestionsForContext(ctx);
    assert.ok(items.length >= 70);
    assert.ok(items.every((item) => item.id.startsWith("oficina-")));
    assert.ok(names(items).includes("Troca de óleo do motor"));
  });
});

describe("35.2.1 hotfix — busca, preço, dedup e browser", () => {
  it("10. digitação livre funciona", async () => {
    const { shouldOfferCustomName, rankLibrarySuggestions } = await load(
      "lib/segments/catalogs/suggest.ts",
    );
    const items = await suggestions("barbearia");
    assert.equal(
      shouldOfferCustomName("Corte executivo premium", items),
      true,
    );
    assert.equal(shouldOfferCustomName("Corte tradicional", items), false);
    const ranked = rankLibrarySuggestions({
      items,
      query: "cor",
      mode: "create",
    });
    assert.ok(ranked.some((item) => item.name === "Corte tradicional"));
    assert.ok(ranked.some((item) => item.name === "Corte infantil"));
    assert.ok(ranked.every((item) => !/óleo|câmbio|alinhamento/i.test(item.name)));
  });

  it("11+12. seleção de template preenche dados permitidos e não inventa preço", async () => {
    const { libraryItemToCreateInput } = await load(
      "lib/segments/library-adopt.ts",
    );
    const { getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const corte = getSegmentServiceLibrary("barbearia").find(
      (item) => item.name === "Corte tradicional",
    );
    assert.ok(corte);
    const created = libraryItemToCreateInput(corte);
    assert.equal(created.nome, "Corte tradicional");
    assert.equal(created.categoria, "Cabelo");
    assert.equal(created.tipo, "servico");
    assert.equal(created.tempo_estimado_minutos, 40);
    assert.equal(created.preco_venda, null);
    assert.equal(created.preco_sugerido, null);
    const withPrice = libraryItemToCreateInput(corte, { preco_venda: 45 });
    assert.equal(withPrice.preco_venda, 45);
    const form = read("components/produtos/produto-form.tsx");
    assert.match(form, /setValue\("preco_venda", null\)/);
    assert.match(form, /Defina o preço cobrado pela sua empresa/);
    assert.match(form, /onPickTemplate/);
    assert.match(form, /ServiceCatalogSuggest/);
  });

  it("13. deduplicação funciona", async () => {
    const { rankLibrarySuggestions } = await load(
      "lib/segments/catalogs/suggest.ts",
    );
    const { planLibraryAdoption } = await load(
      "lib/segments/library-adopt.ts",
    );
    const { getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const items = await suggestions("barbearia");
    const corte = items.find((item) => item.name === "Corte tradicional");
    assert.ok(corte);
    const ranked = rankLibrarySuggestions({
      items,
      query: "corte tradicional",
      existingNames: ["CORTE TRADICIONAL"],
      mode: "create",
    });
    const listed = ranked.find((item) => item.id === corte.id);
    assert.ok(listed?.alreadyRegistered);
    const adopt = rankLibrarySuggestions({
      items,
      query: "corte tradicional",
      existingNames: ["corte tradicional"],
      mode: "adopt",
    });
    assert.ok(!adopt.some((item) => item.id === corte.id));
    const libCorte = getSegmentServiceLibrary("barbearia").find(
      (item) => item.name === "Corte tradicional",
    );
    const plan = planLibraryAdoption(
      "barbearia",
      [libCorte.id, "oficina-transmissao-diagnostico-cambio"],
      [{ nome: "corte tradicional" }],
    );
    assert.equal(plan.skippedDuplicate.length, 1);
    assert.equal(plan.skippedWrongSegment.length, 1);
  });

  it("14. autocomplete do browser não interfere", () => {
    const suggest = read("components/produtos/service-catalog-suggest.tsx");
    assert.match(suggest, /OPERATIONAL_AUTOCOMPLETE_PROPS/);
    assert.match(suggest, /gestoo-service-name/);
    assert.match(suggest, /role="combobox"/);
    assert.match(suggest, /role="listbox"/);
    assert.doesNotMatch(suggest, /<datalist/);
    assert.doesNotMatch(suggest, /list=/);
    const browser = read("lib/ux/browser-autocomplete.ts");
    assert.match(browser, /autoComplete: "off"/);
    assert.match(browser, /data-1p-ignore/);
    const specialty = read(
      "components/mecanicos/professional-specialty-field.tsx",
    );
    assert.doesNotMatch(specialty, /<datalist/);
    assert.match(specialty, /gestoo-professional-specialty/);
    const novo = read("app/(app)/[tenant]/produtos/novo/page.tsx");
    assert.match(novo, /serviceSuggestionsForContext/);
    assert.match(novo, /listNamesForDedup/);
  });
});

describe("35.2.1 hotfix — Agenda, RBAC e isolamento de tenant", () => {
  it("15. Agenda lista serviços ativos do tenant", () => {
    const page = read("app/(app)/[tenant]/agenda/page.tsx");
    assert.match(page, /createProdutoService\(tenant\.id\)/);
    assert.match(page, /tipo: "servico"/);
    assert.match(page, /ativo: true/);
    assert.match(page, /serviceSuggestionsForContext/);
    const form = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(form, /AgendaServiceField/);
    assert.match(form, /catalogoServicos/);
    const field = read("components/agenda/agenda-service-field.tsx");
    assert.match(field, /servicos\.map/);
    assert.doesNotMatch(field, /library\.map\(\(s\) =>[\s\S]*<option/);
  });

  it("16. Agenda não lista serviço de outro tenant", () => {
    const page = read("app/(app)/[tenant]/agenda/page.tsx");
    assert.match(page, /requireTenant\(tenantSlug\)/);
    assert.doesNotMatch(page, /createProdutoService\((?!tenant\.id)/);
    const actions = read("lib/segments/library-actions.ts");
    assert.match(actions, /createProdutoService\(tenant\.id\)/);
    assert.doesNotMatch(actions, /createProdutoService\(\s*values/);
    const service = read("lib/produtos/produto-service.ts");
    assert.match(service, /\.eq\("tenant_id", this.tenantId\)/);
  });

  it("17. Agenda sem serviços mostra CTAs", () => {
    const field = read("components/agenda/agenda-service-field.tsx");
    assert.match(field, /Nenhum serviço cadastrado/);
    assert.match(field, /Escolher das sugestões/);
    assert.match(field, /\+ Criar serviço/);
    assert.match(field, /Peça a um administrador para cadastrar um serviço/);
  });

  it("18. adotar sugestão pela Agenda cria no tenant correto", () => {
    const actions = read("lib/segments/library-actions.ts");
    assert.match(actions, /adoptOneLibraryItemAction/);
    assert.match(actions, /requireTenantMutationPermission/);
    assert.match(actions, /planLibraryAdoption/);
    assert.match(actions, /Sugestão inválida para este segmento/);
    assert.match(actions, /libraryItemToCreateInput/);
    assert.doesNotMatch(actions, /revalidatePath\(`\/\$\{tenantSlug\}\/agenda`\)/);
  });

  it("19+20. serviço criado é selecionado e o contexto do agendamento não é perdido", () => {
    const form = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(form, /selectServico/);
    assert.match(form, /setCatalogoServicos/);
    assert.match(form, /setServicoId\(svc\.id\)/);
    assert.doesNotMatch(form, /setClienteId\(""\)/);
    assert.doesNotMatch(form, /router\.refresh/);
    const field = read("components/agenda/agenda-service-field.tsx");
    assert.match(field, /onUsed/);
    assert.match(field, /Adicionar e usar/);
    assert.doesNotMatch(field, /router\.refresh/);
  });

  it("21. criar serviço personalizado pela Agenda funciona", () => {
    const field = read("components/agenda/agenda-service-field.tsx");
    assert.match(field, /createCustomServiceForAgendaAction/);
    assert.match(field, /Salvar e usar/);
    assert.match(field, /data-fast-input="agenda-quick-create"/);
    const actions = read("lib/segments/library-actions.ts");
    assert.match(actions, /createCustomServiceForAgendaAction/);
    assert.match(actions, /tipo: "servico"/);
    assert.match(actions, /preco_venda: parsed\.preco_venda \?\? null/);
  });

  it("22+23. RBAC impede adoção sem produtos.criar e ainda lista existentes", () => {
    const actions = read("lib/segments/library-actions.ts");
    const adoptOne = actions.slice(actions.indexOf("adoptOneLibraryItemAction"));
    assert.match(adoptOne, /produtos\.criar/);
    const custom = actions.slice(
      actions.indexOf("createCustomServiceForAgendaAction"),
    );
    assert.match(custom, /produtos\.criar/);
    const field = read("components/agenda/agenda-service-field.tsx");
    assert.match(field, /canCreate/);
    assert.match(field, /servicos\.map/);
    const page = read("app/(app)/[tenant]/agenda/page.tsx");
    assert.match(page, /tenantHasMutationPermission/);
    assert.match(page, /produtos\.criar/);
  });

  it("24. mobile funciona", () => {
    for (const f of [
      "components/produtos/service-catalog-suggest.tsx",
      "components/agenda/agenda-service-field.tsx",
    ]) {
      const src = read(f);
      assert.match(src, /min-h-11/);
    }
    assert.match(
      read("components/produtos/service-catalog-suggest.tsx"),
      /onKeyDown/,
    );
    assert.match(
      read("components/agenda/agenda-service-field.tsx"),
      /type="radio"/,
    );
  });

  it("25. capabilities continuam respeitadas", async () => {
    const items = await suggestions("barbearia", {
      segmentConfig: { disabledCapabilities: ["catalog"] },
    });
    assert.equal(items.length, 0);
    const odonto = await suggestions("consultorio_odontologico");
    assert.ok(odonto.every((item) => item.itemType === "servico" || item.itemType === "combo" || item.itemType === "kit"));
    const { hasCapability, resolveSegmentContext } = await load(
      "lib/segments/resolve.ts",
    );
    const ctx = resolveSegmentContext({
      segment: "clinica_estetica",
      ...ENGINE,
    });
    assert.equal(hasCapability(ctx, "patient_records"), false);
  });
});

describe("35.2.1 hotfix — contratos de página e regressão", () => {
  it("páginas e forms não ramificam por if (segment === …)", () => {
    for (const f of [
      "app/(app)/[tenant]/produtos/novo/page.tsx",
      "app/(app)/[tenant]/agenda/page.tsx",
      "components/produtos/produto-form.tsx",
      "components/produtos/service-catalog-suggest.tsx",
      "components/agenda/agenda-event-create-form.tsx",
      "components/agenda/agenda-service-field.tsx",
    ]) {
      assert.doesNotMatch(read(f), /if \(segment ===/);
    }
  });

  it("não duplica catálogo nem inventa billing/WhatsApp/cron", () => {
    assert.ok(existsSync(join(root, "lib/segments/catalogs/suggest.ts")));
    assert.ok(existsSync(join(root, "components/produtos/service-catalog-suggest.tsx")));
    assert.ok(existsSync(join(root, "components/agenda/agenda-service-field.tsx")));
    for (const f of [
      "lib/segments/catalogs/suggest.ts",
      "lib/segments/library-actions.ts",
      "components/produtos/service-catalog-suggest.tsx",
      "components/agenda/agenda-service-field.tsx",
      "components/agenda/agenda-event-create-form.tsx",
      "app/(app)/[tenant]/produtos/novo/page.tsx",
      "app/(app)/[tenant]/agenda/page.tsx",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /CORTE_MASCULINO|BARBEARIA_SERVICES\s*=/);
      assert.doesNotMatch(src, /asaas/i);
      assert.doesNotMatch(src, /stripe/i);
      assert.doesNotMatch(src, /twilio\.com/i);
    }
  });

  it("servico_id da agenda continua UUID do tenant, nunca slug da biblioteca", () => {
    const schema = read("lib/agenda/validations.ts");
    assert.match(schema, /servico_id: optionalUuid/);
    const field = read("components/agenda/agenda-service-field.tsx");
    assert.match(field, /libraryItemId: selected\.id/);
    assert.match(field, /id: res\.id/);
  });
});
